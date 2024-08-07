import { Module, Global } from '@nestjs/common';
import { LibService } from './lib.service';

@Global()
@Module({
  providers: [LibService],
  exports: [LibService],
})
export class LibModule {}
