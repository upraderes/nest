import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OpenShiftService } from '../openshift/openshift.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class PodMonitorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PodMonitorGateway.name);
  private connectedClients = new Set<string>();

  constructor(private readonly openShiftService: OpenShiftService) {}

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(`🔌 Client connected: ${client.id} (Total: ${this.connectedClients.size})`);
    
    // Send initial data to the newly connected client
    this.sendPodUpdate(client);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`🔌 Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('subscribe-pods')
  handleSubscribePods(@MessageBody() data: { namespaces?: string[] }) {
    this.logger.log(`📡 Client subscribed to pod updates: ${data.namespaces?.join(', ') || 'all'}`);
    return { event: 'subscription-confirmed', data: { namespaces: data.namespaces } };
  }

  @SubscribeMessage('get-pods')
  handleGetPods() {
    return {
      event: 'pods-data',
      data: {
        pods: this.openShiftService.getAllPods(),
        stats: this.openShiftService.getMonitoringStats(),
        connected: this.openShiftService.isClusterConnected(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @SubscribeMessage('execute-action')
  async handleExecuteAction(@MessageBody() data: { action: string; namespace: string; podName?: string }) {
    try {
      const result = await this.openShiftService.executePodAction({
        action: data.action as 'start' | 'stop' | 'restart',
        namespace: data.namespace,
        podName: data.podName,
      });

      // Broadcast the action result to all clients
      this.broadcastActionResult({
        ...result,
        action: data.action,
        namespace: data.namespace,
        podName: data.podName,
        timestamp: new Date().toISOString(),
      });

      return { event: 'action-completed', data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Action execution failed:`, errorMessage);
      
      return {
        event: 'action-error',
        data: {
          success: false,
          message: errorMessage,
          action: data.action,
          namespace: data.namespace,
          podName: data.podName,
        },
      };
    }
  }

  @SubscribeMessage('execute-bulk-action')
  async handleExecuteBulkAction(@MessageBody() data: { action: string; namespaces: string[] }) {
    try {
      const results = [];
      const errors = [];

      this.logger.log(`🚀 Executing bulk ${data.action} on ${data.namespaces.length} namespaces: ${data.namespaces.join(', ')}`);

      for (const namespace of data.namespaces) {
        try {
          const result = await this.openShiftService.executePodAction({
            action: data.action as 'start' | 'stop' | 'restart',
            namespace,
          });
          results.push({ namespace, ...result });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ namespace, error: errorMessage });
        }
      }

      const bulkResult = {
        success: errors.length === 0,
        action: data.action,
        namespaces: data.namespaces,
        results,
        errors,
        summary: {
          total: data.namespaces.length,
          successful: results.filter(r => r.success).length,
          failed: errors.length,
        },
        timestamp: new Date().toISOString(),
      };

      // Broadcast the bulk action result to all clients
      this.server.emit('bulk-action-result', bulkResult);

      return { event: 'bulk-action-completed', data: bulkResult };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Bulk action execution failed:`, errorMessage);
      
      return {
        event: 'bulk-action-error',
        data: {
          success: false,
          message: errorMessage,
          action: data.action,
          namespaces: data.namespaces,
        },
      };
    }
  }

  // Broadcast pod updates to all connected clients every 5 seconds
  @Cron(CronExpression.EVERY_5_SECONDS)
  private broadcastPodUpdates() {
    if (this.connectedClients.size === 0) return;

    try {
      const data = {
        pods: this.openShiftService.getAllPods(),
        stats: this.openShiftService.getMonitoringStats(),
        connected: this.openShiftService.isClusterConnected(),
        timestamp: new Date().toISOString(),
      };

      this.server.emit('pods-update', data);
    } catch (error) {
      this.logger.error('Failed to broadcast pod updates:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private sendPodUpdate(client: Socket) {
    try {
      const data = {
        pods: this.openShiftService.getAllPods(),
        stats: this.openShiftService.getMonitoringStats(),
        connected: this.openShiftService.isClusterConnected(),
        timestamp: new Date().toISOString(),
      };

      client.emit('pods-update', data);
    } catch (error) {
      this.logger.error('Failed to send pod update to client:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private broadcastActionResult(result: any) {
    this.server.emit('action-result', result);
  }

  // Public method to broadcast notifications
  broadcastNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.server.emit('notification', {
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}