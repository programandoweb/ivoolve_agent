import { Global, Module } from '@nestjs/common';

import { DatabaseService } from './database.service';
import { ExecutionTraceService } from './execution-trace.service';

@Global()
@Module({
  providers: [DatabaseService, ExecutionTraceService],
  exports: [DatabaseService, ExecutionTraceService],
})
export class DatabaseModule {}
