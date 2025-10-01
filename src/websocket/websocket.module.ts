import { Module } from '@nestjs/common';
import { PodMonitorGateway } from './pod-monitor.gateway';
import { OpenShiftModule } from '../openshift/openshift.module';

@Module({
  imports: [OpenShiftModule],
  providers: [PodMonitorGateway],
  exports: [PodMonitorGateway],
})
export class WebSocketModule {}