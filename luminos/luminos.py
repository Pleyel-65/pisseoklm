#!/usr/bin/env python3

# include RPi libraries in to Python code
import RPi.GPIO as GPIO
import time
import subprocess
import os

class Logger:

    LOG_FILE=os.environ['CACA_LOG']

    def __init__(self):
      self.file = open(Logger.LOG_FILE, "a")

    def log(self, event):
        ts = int(time.time())
        self.file.write(str(ts) + " " + event + "\n")
        self.file.flush()

    def arrival(self):
        self.log("arrival")

    def departure(self):
        self.log("departure")



class piGPIO:
    def __init__(self):

        # define GPIO pins with variables a_pin and b_pin
        self.a_pin = 13
        self.b_pin = 19
        self.led_pin = 26
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(self.led_pin, GPIO.OUT)

    # create discharge function for reading capacitor data
    def discharge(self):
        GPIO.setup(self.a_pin, GPIO.IN)
        GPIO.setup(self.b_pin, GPIO.OUT)
        GPIO.output(self.b_pin, False)
        time.sleep(0.05)

    # create time function for capturing analog count value
    def charge_time(self):
        GPIO.setup(self.b_pin, GPIO.IN)
        GPIO.setup(self.a_pin, GPIO.OUT)
        count = 0
        GPIO.output(self.a_pin, True)
        while count < 10 and not GPIO.input(self.b_pin):
            count = count +1
        return count

    # create analog read function for reading charging and discharging data
    def analog_read(self):
        self.discharge()
        return self.charge_time()

    # turn indicator white led
    def ledState(self, state):
        GPIO.output(self.led_pin, state)


# provide a loop to display analog data count value on the screen
if __name__=="__main__":
    
    gpio = piGPIO()
    logger = Logger()

    lastBright = False
    while True:
        try:

            howBright = gpio.analog_read() < 10

            if howBright:
                gpio.ledState(GPIO.HIGH)
            else:
                gpio.ledState(GPIO.LOW)

            if lastBright != howBright:
                if howBright:
                  logger.arrival()
                else:
                  logger.departure()

            lastBright = howBright

            time.sleep(0.05)

        except BaseException as e:
            print("Cleaning GPIO")
            GPIO.cleanup()
            raise 
