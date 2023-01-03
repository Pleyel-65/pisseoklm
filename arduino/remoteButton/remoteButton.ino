#include <SPI.h>
#include "printf.h"
#include "RF24.h"

const int ledPin = D1; // NodeMCU builtin led
const int buttonPin = D0;  // the number of the pushbutton pin
int buttonState;         // the current reading from the input pin
int lastButtonState = LOW;  // the previous reading from the input pin

// the following variables are unsigned longs because the time, measured in
// milliseconds, will quickly become a bigger number than can be stored in an int.
unsigned long lastDebounceTime = 0;  // the last time the output pin was toggled
unsigned long debounceDelay = 50;    // the debounce time; increase if the output flickers

RF24 radio(D4, D3);
uint8_t writeAddr[] = { 0x42, 0x42, 0x42, 0x42, 0x42 };
uint8_t readAddr[] = { 0x23, 0x23, 0x23, 0x23, 0x23 };

char origin[8] = "node1";
char subject[8] = "button1";

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

Payload payload = {0};

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    // some boards need to wait to ensure access to serial over USB
  }

  if (sizeof(payload) > payloadSize) {
    Serial.println(F("WARNING: payload bigger than payload size"));
  }
  Serial.print(F("payload size = "));
  Serial.print(sizeof(payload));
  Serial.println(F("."));

  memcpy(payload.origin, origin, sizeof(origin));
  memcpy(payload.subject, subject, sizeof(subject));
  payload.dataType = (uint8_t) DATA_BOOL;

  pinMode(buttonPin, INPUT);
  pinMode(ledPin, OUTPUT);

  // set initial LED state
  digitalWrite(ledPin, LOW);

  // setup radio
  if (!radio.begin()) {
    Serial.println(F("radio hardware is not responding!!"));
    while (1) {}  // hold in infinite loop
  }
  radio.setPALevel(RF24_PA_LOW);
  radio.setPayloadSize(payloadSize);
  radio.openWritingPipe(writeAddr);
  radio.openReadingPipe(1, readAddr);
  radio.stopListening();
  printf_begin();
  radio.printDetails();
  radio.printPrettyDetails();
}

void loop() {
  // read the state of the switch into a local variable:
  int reading = digitalRead(buttonPin);

  // check to see if you just pressed the button
  // (i.e. the input went from LOW to HIGH), and you've waited long enough
  // since the last press to ignore any noise:

  // If the switch changed, due to noise or pressing:
  if (reading != lastButtonState) {
    // reset the debouncing timer
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    // whatever the reading is at, it's been there for longer than the debounce
    // delay, so take it as the actual current state:

    // if the button state has changed:
    if (reading != buttonState) {

      buttonState = reading;

      send(buttonState);
    }
  }

  // set the LED:
  digitalWrite(ledPin, buttonState);

  // save the reading. Next time through the loop, it'll be the lastButtonState:
  lastButtonState = reading;
}

void send(int buttonState) {

  payload.valueBool = (uint8_t) buttonState;

  unsigned long start_timer = micros();
  // bool report = radio.write(&payload, sizeof(payload));
  bool report = radio.write(&payload, sizeof(payload));

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
