import { Module, forwardRef } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventsModule } from '../events/events.module';
import { ParkingEventsModule } from '../parking-events/parking-events.module';
import { SlotsModule } from '../slots/slots.module';
import {
  GateActivityMonitoringController,
  GateMonitoringController,
} from './controllers/gate-monitoring.controller';
import { GateManualController } from './controllers/gate-manual.controller';
import { GatesController } from './controllers/gates.controller';
import { IotDevicesController } from './controllers/iot-devices.controller';
import { IotSimulatorController } from './controllers/iot-simulator.controller';
import { VehicleAccessCredentialsNestedController } from './controllers/vehicle-access-credentials-nested.controller';
import { IotConfigValidator } from './iot-config.validator';
import { resolveIotConfig } from './iot.config';
import { InMemoryMqttTransport } from './mqtt/in-memory-mqtt.transport';
import { MqttBridgeService } from './mqtt/mqtt-bridge.service';
import { MQTT_TRANSPORT } from './mqtt/mqtt-transport.interface';
import { MqttJsTransport } from './mqtt/mqttjs.transport';
import { GateAccessDecisionService } from './services/gate-access-decision.service';
import { GateCommandsService } from './services/gate-commands.service';
import { GateDetectionProcessorService } from './services/gate-detection-processor.service';
import { GateMonitoringService } from './services/gate-monitoring.service';
import { GatesService } from './services/gates.service';
import { IotDevicesService } from './services/iot-devices.service';
import { IotParkingOrchestrationService } from './services/iot-parking-orchestration.service';
import { VehicleAccessCredentialsService } from './services/vehicle-access-credentials.service';

const iotConfig = resolveIotConfig();
const simulatorControllers =
  iotConfig.simulatorEnabled && process.env.NODE_ENV !== 'production'
    ? [IotSimulatorController]
    : [];

@Module({
  imports: [forwardRef(() => EventsModule), ParkingEventsModule, SlotsModule],
  controllers: [
    GatesController,
    IotDevicesController,
    VehicleAccessCredentialsNestedController,
    GateMonitoringController,
    GateActivityMonitoringController,
    GateManualController,
    ...simulatorControllers,
  ],
  providers: [
    {
      provide: MQTT_TRANSPORT,
      useFactory: () => {
        if (!iotConfig.enabled) {
          return new InMemoryMqttTransport();
        }

        return new MqttJsTransport({
          brokerUrl: iotConfig.mqtt.brokerUrl,
          clientId: `${iotConfig.mqtt.clientIdPrefix}-${randomUUID()}`,
          username: iotConfig.mqtt.username,
          password: iotConfig.mqtt.password,
        });
      },
    },
    IotConfigValidator,
    GateAccessDecisionService,
    GateDetectionProcessorService,
    IotParkingOrchestrationService,
    GatesService,
    IotDevicesService,
    VehicleAccessCredentialsService,
    GateCommandsService,
    GateMonitoringService,
    MqttBridgeService,
  ],
  exports: [MqttBridgeService, GateCommandsService],
})
export class IotModule {}