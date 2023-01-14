#include <SPI.h>
#include "printf.h"
#include "RF24.h"

RF24 radio;

struct GlobalConfig {
  char origin[8];
  uint8_t addr[5];
  uint8_t remoteAddr[5];
  int cePin;
  int csPin;
  int irqPin;
};

GlobalConfig globalConfig = {
  "node1",
  { 0x23, 0x23, 0x23, 0x23, 0x23 },
  { 0x42, 0x42, 0x42, 0x42, 0x42 },
  9, 10, 2
};


struct DigitalInputConfig {
  int pin;
  uint8_t dest[5];
  char subject[8];
  unsigned long debounceDelay; // the debounce time; increase if the output flickers
};

struct DigitalInputState {
  int currentValue;
  int lastValue;
  unsigned long lastDebounceTime;  // the last time the output pin was toggled
};

struct DigitalOutputConfig {
  int pin;
  char origin[8];
  char subject[8];
  int initialValue;
};

DigitalInputConfig digitalInputConfigs[1] = {
  {5, "button1", 50},
};
DigitalInputState digitalInputStates[1] = {0};

DigitalOutputConfig digitalOutputConfigs[1] = {
  {4, "master", "led1", LOW}
};

enum DataType {
  DATA_BOOL = 0,
  DATA_INT = 1,
  DATA_UINT = 2,
  DATA_FLOAT = 3
};

const int payloadSize = 32;

struct Payload {
  char origin[8];
  char subject[8];
  uint8_t dataType;
  union {
    uint8_t valueBool;
    int32_t valueInt;
    uint32_t valueUint;
    float valueFloat;
  };
 } __attribute__((packed));

Payload txPayload = {0};
Payload rxPayload = {0};


void initDigitalInputs() {
  for (int i = 0; i < sizeof(digitalInputConfigs) / sizeof(digitalInputConfigs[0]); i++) {
    pinMode(digitalInputConfigs[i].pin, INPUT);
    digitalInputStates[i].lastValue = digitalRead(digitalInputConfigs[i].pin);
    digitalInputStates[i].currentValue = digitalRead(digitalInputConfigs[i].pin);
    digitalInputStates[i].lastDebounceTime = 0;
  }
}

void initDigitalOutputs() {
  for (int i = 0; i < sizeof(digitalOutputConfigs) / sizeof(digitalOutputConfigs[0]); i++) {
    pinMode(digitalOutputConfigs[i].pin, OUTPUT);
    digitalWrite(digitalOutputConfigs[i].pin, digitalOutputConfigs[i].initialValue);
  }
}

void initRadio() {

  radio = RF24(globalConfig.cePin, globalConfig.csPin);

  if (!radio.begin()) {
    Serial.println(F("radio hardware is not responding!!"));
    while (1) {}  // hold in infinite loop
  }
  radio.setPALevel(RF24_PA_LOW);
  radio.maskIRQ(true, true, false);
  radio.setPayloadSize(payloadSize);
  radio.openWritingPipe(globalConfig.remoteAddr);
  radio.openReadingPipe(1, globalConfig.addr);
  radio.startListening();
  printf_begin();
  radio.printDetails();
  radio.printPrettyDetails();
  attachInterrupt(digitalPinToInterrupt(globalConfig.irqPin), interruptHandler, FALLING);
}

void initPayload() {
  if (sizeof(Payload) > payloadSize) {
    Serial.println(F("WARNING: payload bigger than payload size"));
  }
  Serial.print(F("payload size = "));
  Serial.print(sizeof(Payload));
  Serial.println(F("."));

  memcpy(txPayload.origin, globalConfig.origin, sizeof(globalConfig.origin));
}

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    // some boards need to wait to ensure access to serial over USB
  }

  initPayload();
  initDigitalInputs();
  initDigitalOutputs();
  initRadio();
}

void loopDigitalInputs() {
  for (int i = 0; i < sizeof(digitalInputConfigs) / sizeof(digitalInputConfigs[0]); i++) {

    DigitalInputConfig* config = &digitalInputConfigs[i];
    DigitalInputState* state = &digitalInputStates[i];

    // read the state of the switch into a local variable:
    int reading = digitalRead(config->pin);

    // check to see if you just pressed the button
    // (i.e. the input went from LOW to HIGH), and you've waited long enough
    // since the last press to ignore any noise:

    // If the switch changed, due to noise or pressing:
    if (reading != state->lastValue) {
      // reset the debouncing timer
      state->lastDebounceTime = millis();
    }

    if ((millis() - state->lastDebounceTime) > config->debounceDelay) {
      // whatever the reading is at, it's been there for longer than the debounce
      // delay, so take it as the actual current state:

      // if the button state has changed:
      if (reading != state->currentValue) {
        state->currentValue = reading;
        bool value = reading == HIGH ? true : false;
        send(config->subject, DATA_BOOL, (void*)&value);
      }
    }

    // save the reading. Next time through the loop, it'll be the lastValue:
    state->lastValue = reading;
  }
}

void loop() {
  loopDigitalInputs();
}

void send(char subject[8], DataType dataType, void *value) {

  memcpy(txPayload.subject, subject, sizeof(subject));
  txPayload.dataType = dataType;
  if (dataType == DATA_BOOL) {
    txPayload.valueBool = *((uint8_t*) value);
  }
  else {
    // TODO
  }

  unsigned long start_timer = micros();
  // bool report = radio.write(&payload, sizeof(payload));
  radio.stopListening();
  bool report = radio.write(&txPayload, sizeof(txPayload));
  radio.startListening();

  unsigned long end_timer = micros();
  if (report) {
    Serial.print(F("Transmission successful! "));  // payload was delivered
    Serial.print(F("Time to transmit = "));
    Serial.print(end_timer - start_timer);  // print the timer result
    Serial.println(F(" us."));
  } else {
    Serial.println(F("Transmission failed or timed out"));  // payload was not delivered
  }
}

void interruptHandler() {
  while(radio.available()) {
    radio.read(&rxPayload, sizeof(rxPayload));
    Serial.print(F("radio received : "));
    Serial.print(rxPayload.origin);
    Serial.print(F(", "));
    Serial.println(rxPayload.subject);

    handleDigtalOutputRequests();
  }
}

void handleDigtalOutputRequests() {

  if (rxPayload.dataType != DATA_BOOL) {
    return ;
  }

  for (int i = 0; i < sizeof(digitalOutputConfigs) / sizeof(digitalOutputConfigs[0]); i++) {
    DigitalOutputConfig config = digitalOutputConfigs[i];
    if (strcmp(config.origin, rxPayload.origin) == 0 && strcmp(config.subject, rxPayload.subject) == 0) {
      digitalWrite(config.pin, rxPayload.valueBool ? HIGH : LOW);
    }
  }
}