import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { OpenShiftService } from './openshift.service';
import { PodAction, NamespaceConfig } from './interfaces/pod.interface';

@Controller('api/openshift')
export class OpenShiftController {
  constructor(private readonly openShiftService: OpenShiftService) {}

  @Get('pods')
  getAllPods() {
    try {
      return {
        success: true,
        data: this.openShiftService.getAllPods(),
        stats: this.openShiftService.getMonitoringStats(),
        connected: this.openShiftService.isClusterConnected(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch pods: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('pods/:namespace')
  getPodsByNamespace(@Param('namespace') namespace: string) {
    try {
      return {
        success: true,
        data: this.openShiftService.getPodsByNamespace(namespace),
        namespace,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch pods for namespace ${namespace}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  getStats() {
    try {
      return {
        success: true,
        data: this.openShiftService.getMonitoringStats(),
        connected: this.openShiftService.isClusterConnected(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('namespaces')
  getNamespaces() {
    try {
      return {
        success: true,
        data: this.openShiftService.getNamespaces(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch namespaces: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('namespaces')
  async updateNamespaces(@Body() namespaces: NamespaceConfig[]) {
    try {
      await this.openShiftService.updateNamespaceConfig(namespaces);
      return {
        success: true,
        message: 'Namespaces updated successfully',
        data: namespaces,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update namespaces: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('action')
  async executePodAction(@Body() action: PodAction) {
    try {
      const result = await this.openShiftService.executePodAction(action);
      
      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('action/start/:namespace')
  async startNamespacePods(@Param('namespace') namespace: string) {
    return this.executePodAction({
      action: 'start',
      namespace,
    });
  }

  @Post('action/stop/:namespace')
  async stopNamespacePods(@Param('namespace') namespace: string) {
    return this.executePodAction({
      action: 'stop',
      namespace,
    });
  }

  @Post('action/restart/:namespace')
  async restartNamespacePods(@Param('namespace') namespace: string) {
    return this.executePodAction({
      action: 'restart',
      namespace,
    });
  }

  @Post('action/bulk')
  async executeBulkAction(@Body() bulkAction: { action: 'start' | 'stop' | 'restart'; namespaces: string[] }) {
    try {
      const results = [];
      const errors = [];

      for (const namespace of bulkAction.namespaces) {
        try {
          const result = await this.openShiftService.executePodAction({
            action: bulkAction.action,
            namespace,
          });
          results.push({ namespace, ...result });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ namespace, error: errorMessage });
        }
      }

      return {
        success: errors.length === 0,
        message: `Bulk ${bulkAction.action} completed on ${bulkAction.namespaces.length} namespaces`,
        results,
        errors,
        summary: {
          total: bulkAction.namespaces.length,
          successful: results.filter(r => r.success).length,
          failed: errors.length,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to execute bulk action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('action/bulk/start')
  async startMultipleNamespaces(@Body() data: { namespaces: string[] }) {
    return this.executeBulkAction({
      action: 'start',
      namespaces: data.namespaces,
    });
  }

  @Post('action/bulk/stop')
  async stopMultipleNamespaces(@Body() data: { namespaces: string[] }) {
    return this.executeBulkAction({
      action: 'stop',
      namespaces: data.namespaces,
    });
  }

  @Post('action/bulk/restart')
  async restartMultipleNamespaces(@Body() data: { namespaces: string[] }) {
    return this.executeBulkAction({
      action: 'restart',
      namespaces: data.namespaces,
    });
  }

  @Get('health')
  getHealth() {
    return {
      success: true,
      connected: this.openShiftService.isClusterConnected(),
      timestamp: new Date().toISOString(),
      namespaces: this.openShiftService.getNamespaces().length,
      totalPods: this.openShiftService.getAllPods().length,
    };
  }
}