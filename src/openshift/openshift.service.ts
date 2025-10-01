import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as k8s from '@kubernetes/client-node';
import { PodStatus, NamespaceConfig, PodAction, MonitoringStats, ContainerStatus } from './interfaces/pod.interface';

@Injectable()
export class OpenShiftService implements OnModuleInit {
  private readonly logger = new Logger(OpenShiftService.name);
  private k8sApi: k8s.CoreV1Api;
  private k8sAppsApi: k8s.AppsV1Api;
  private kc: k8s.KubeConfig;
  private pods: Map<string, PodStatus> = new Map();
  private namespaces: NamespaceConfig[] = [];
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeKubernetesClient();
    await this.loadNamespaceConfig();
    await this.startMonitoring();
  }

  private async initializeKubernetesClient() {
    try {
      this.kc = new k8s.KubeConfig();
      
      // Try to load from default locations (kubeconfig file or service account)
      if (process.env.KUBECONFIG) {
        this.kc.loadFromFile(process.env.KUBECONFIG);
      } else if (process.env.KUBERNETES_SERVICE_HOST) {
        // Running inside a cluster
        this.kc.loadFromCluster();
      } else {
        // Load from default kubeconfig location
        this.kc.loadFromDefault();
      }

      this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
      this.k8sAppsApi = this.kc.makeApiClient(k8s.AppsV1Api);
      
      // Test connection
      await this.k8sApi.listNamespace();
      this.isConnected = true;
      this.logger.log('✅ Successfully connected to OpenShift/Kubernetes cluster');
      
    } catch (error) {
      this.logger.error('❌ Failed to connect to OpenShift/Kubernetes cluster:', error instanceof Error ? error.message : String(error));
      this.isConnected = false;
    }
  }

  private async loadNamespaceConfig() {
    // Load namespaces from environment or config
    const namespacesEnv = this.configService.get<string>('OPENSHIFT_NAMESPACES', 
      'default,kube-system,openshift-console,openshift-monitoring');
    
    this.namespaces = namespacesEnv.split(',').map(name => ({
      name: name.trim(),
      enabled: true,
      refreshInterval: 5000, // 5 seconds
    }));

    this.logger.log(`📋 Monitoring namespaces: ${this.namespaces.map(ns => ns.name).join(', ')}`);
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async startMonitoring() {
    if (!this.isConnected) {
      await this.initializeKubernetesClient();
      return;
    }

    try {
      await this.fetchAllPods();
    } catch (error) {
      this.logger.error('Error during pod monitoring:', error instanceof Error ? error.message : String(error));
    }
  }

  private async fetchAllPods() {
    const newPods = new Map<string, PodStatus>();

    for (const namespace of this.namespaces.filter(ns => ns.enabled)) {
      try {
        const response = await this.k8sApi.listNamespacedPod(namespace.name);
        
        for (const pod of response.body.items) {
          const podStatus = this.convertToPodStatus(pod);
          const key = `${podStatus.namespace}/${podStatus.name}`;
          newPods.set(key, podStatus);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch pods from namespace ${namespace.name}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Update the pods map
    const previousCount = this.pods.size;
    this.pods = newPods;
    
    if (previousCount !== this.pods.size) {
      this.logger.log(`📊 Pod count changed: ${previousCount} → ${this.pods.size}`);
    }
  }

  private convertToPodStatus(pod: k8s.V1Pod): PodStatus {
    const containers: ContainerStatus[] = (pod.status?.containerStatuses || []).map(container => ({
      name: container.name,
      ready: container.ready || false,
      restartCount: container.restartCount || 0,
      state: this.getContainerState(container),
      image: container.image || 'unknown',
    }));

    return {
      name: pod.metadata?.name || 'unknown',
      namespace: pod.metadata?.namespace || 'unknown',
      status: pod.status?.phase || 'Unknown',
      phase: pod.status?.phase || 'Unknown',
      ready: this.isPodReady(pod),
      restarts: containers.reduce((sum, c) => sum + c.restartCount, 0),
      age: this.calculateAge(pod.metadata?.creationTimestamp),
      node: pod.spec?.nodeName || 'unknown',
      ip: pod.status?.podIP || 'unknown',
      labels: pod.metadata?.labels || {},
      containers,
      createdAt: pod.metadata?.creationTimestamp ? new Date(pod.metadata.creationTimestamp) : new Date(),
      updatedAt: new Date(),
    };
  }

  private getContainerState(container: k8s.V1ContainerStatus): string {
    if (container.state?.running) return 'Running';
    if (container.state?.waiting) return `Waiting: ${container.state.waiting.reason || 'Unknown'}`;
    if (container.state?.terminated) return `Terminated: ${container.state.terminated.reason || 'Unknown'}`;
    return 'Unknown';
  }

  private isPodReady(pod: k8s.V1Pod): boolean {
    const conditions = pod.status?.conditions || [];
    const readyCondition = conditions.find(c => c.type === 'Ready');
    return readyCondition?.status === 'True';
  }

  private calculateAge(creationTimestamp?: Date | string): string {
    if (!creationTimestamp) return 'unknown';
    
    const created = new Date(creationTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return '<1m';
  }

  // Public methods for the API

  getAllPods(): PodStatus[] {
    return Array.from(this.pods.values());
  }

  getPodsByNamespace(namespace: string): PodStatus[] {
    return Array.from(this.pods.values()).filter(pod => pod.namespace === namespace);
  }

  getMonitoringStats(): MonitoringStats {
    const pods = this.getAllPods();
    
    return {
      totalPods: pods.length,
      runningPods: pods.filter(p => p.status === 'Running').length,
      pendingPods: pods.filter(p => p.status === 'Pending').length,
      failedPods: pods.filter(p => p.status === 'Failed').length,
      lastUpdate: new Date(),
      namespaces: this.namespaces.map(ns => ns.name),
    };
  }

  async executePodAction(action: PodAction): Promise<{ success: boolean; message: string; affectedPods?: string[] }> {
    if (!this.isConnected) {
      return { success: false, message: 'Not connected to OpenShift cluster' };
    }

    try {
      switch (action.action) {
        case 'start':
          return await this.startPods(action.namespace, action.podName);
        case 'stop':
          return await this.stopPods(action.namespace, action.podName);
        case 'restart':
          return await this.restartPods(action.namespace, action.podName);
        default:
          return { success: false, message: `Unknown action: ${action.action}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to execute ${action.action} on ${action.namespace}/${action.podName || 'all'}:`, errorMessage);
      return { success: false, message: errorMessage };
    }
  }

  private async startPods(namespace: string, podName?: string): Promise<{ success: boolean; message: string; affectedPods?: string[] }> {
    // For OpenShift/Kubernetes, "starting" means scaling up deployments to desired replicas
    try {
      const deploymentsResponse = await this.k8sAppsApi.listNamespacedDeployment(namespace);
      const affectedPods: string[] = [];

      for (const deployment of deploymentsResponse.body.items) {
        if (podName && !deployment.metadata?.name?.includes(podName)) continue;

        const currentReplicas = deployment.spec?.replicas || 0;
        if (currentReplicas === 0) {
          // Scale up to 1 replica (or restore from annotation if available)
          const desiredReplicas = parseInt(deployment.metadata?.annotations?.['openshift.io/deployment-config.latest-version'] || '1');
          
          const patch = {
            spec: {
              replicas: Math.max(desiredReplicas, 1)
            }
          };

          await this.k8sAppsApi.patchNamespacedDeployment(
            deployment.metadata?.name || '',
            namespace,
            patch,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-Type': 'application/merge-patch+json' } }
          );

          affectedPods.push(deployment.metadata?.name || 'unknown');
        }
      }

      return {
        success: true,
        message: `Started ${affectedPods.length} deployments in namespace ${namespace}`,
        affectedPods
      };
    } catch (error) {
      throw new Error(`Failed to start pods: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async stopPods(namespace: string, podName?: string): Promise<{ success: boolean; message: string; affectedPods?: string[] }> {
    // For OpenShift/Kubernetes, "stopping" means scaling down deployments to 0 replicas
    try {
      const deploymentsResponse = await this.k8sAppsApi.listNamespacedDeployment(namespace);
      const affectedPods: string[] = [];

      for (const deployment of deploymentsResponse.body.items) {
        if (podName && !deployment.metadata?.name?.includes(podName)) continue;

        const currentReplicas = deployment.spec?.replicas || 0;
        if (currentReplicas > 0) {
          const patch = {
            spec: {
              replicas: 0
            }
          };

          await this.k8sAppsApi.patchNamespacedDeployment(
            deployment.metadata?.name || '',
            namespace,
            patch,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { headers: { 'Content-Type': 'application/merge-patch+json' } }
          );

          affectedPods.push(deployment.metadata?.name || 'unknown');
        }
      }

      return {
        success: true,
        message: `Stopped ${affectedPods.length} deployments in namespace ${namespace}`,
        affectedPods
      };
    } catch (error) {
      throw new Error(`Failed to stop pods: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async restartPods(namespace: string, podName?: string): Promise<{ success: boolean; message: string; affectedPods?: string[] }> {
    // Restart by deleting pods (they will be recreated by the deployment)
    try {
      let podsToRestart = this.getPodsByNamespace(namespace);
      
      if (podName) {
        podsToRestart = podsToRestart.filter(pod => pod.name.includes(podName));
      }

      const affectedPods: string[] = [];

      for (const pod of podsToRestart) {
        await this.k8sApi.deleteNamespacedPod(pod.name, namespace);
        affectedPods.push(pod.name);
      }

      return {
        success: true,
        message: `Restarted ${affectedPods.length} pods in namespace ${namespace}`,
        affectedPods
      };
    } catch (error) {
      throw new Error(`Failed to restart pods: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getNamespaces(): NamespaceConfig[] {
    return this.namespaces;
  }

  async updateNamespaceConfig(namespaces: NamespaceConfig[]): Promise<void> {
    this.namespaces = namespaces;
    this.logger.log(`📋 Updated monitoring namespaces: ${namespaces.filter(ns => ns.enabled).map(ns => ns.name).join(', ')}`);
  }

  isClusterConnected(): boolean {
    return this.isConnected;
  }
}