import { Module } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';
import { ApiFallbackController } from './api-fallback.controller';
import { AppController } from './app.controller';
import { CatalogController } from './catalog.controller';
import { HomeController } from './home.controller';
import { InspectionsController } from './inspections.controller';
import { InspectionStore } from './inspection.store';
import { OperationsController } from './operations.controller';
import { APP_FILTER } from '@nestjs/core';

@Module({
  controllers: [
    AppController,
    CatalogController,
    InspectionsController,
    HomeController,
    OperationsController,
    ApiFallbackController,
  ],
  providers: [
    InspectionStore,
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}