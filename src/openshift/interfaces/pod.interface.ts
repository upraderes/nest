export interface PodStatus {
  name: string;
  namespace: string;
  status: string;
  phase: string;
  ready: boolean;
  restarts: number;
  age: string;
  node: string;
  ip: string;
  labels: Record<string, string>;
  containers: ContainerStatus[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContainerStatus {
  name: string;
  ready: boolean;
  restartCount: number;
  state: string;
  image: string;
}

export interface NamespaceConfig {
  name: string;
  enabled: boolean;
  refreshInterval?: number;
}

export interface PodAction {
  action: 'start' | 'stop' | 'restart';
  namespace: string;
  podName?: string; // If not provided, applies to all pods in namespace
}

export interface MonitoringStats {
  totalPods: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
  lastUpdate: Date;
  namespaces: string[];
}