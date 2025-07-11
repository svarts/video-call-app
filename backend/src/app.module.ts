import { Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';

@Module({
  imports: [],
  providers: [AppGateway],
})
export class AppModule {}
