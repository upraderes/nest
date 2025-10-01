import { Module } from '@nestjs/common';
import { OpenShiftService } from './openshift.service';
import { OpenShiftController } from './openshift.controller';

@Module({
  providers: [OpenShiftService],
  controllers: [OpenShiftController],
  exports: [OpenShiftService],
})
export class OpenShiftModule {}