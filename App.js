/* eslint-disable react-native/no-inline-styles */
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Button,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
} from 'react-native';

import BleManager from 'react-native-ble-manager';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const peripherals = new Map();
  const [list, setList] = useState([]);

  const isAndroid12ORAbove = () => {
    return Platform.OS === 'android' && Platform.Version >= 31;
  };

  useEffect(() => {
    BleManager.start({showAlert: false, forceLegacy: true});

    const ble1 = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );

    const ble2 = bleManagerEmitter.addListener(
      'BleManagerStopScan',
      handleStopScan,
    );

    const ble3 = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      handleDisconnectedPeripheral,
    );

    const ble4 = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic,
    );

    checkForBluetoothPermission();

    return () => {
      ble4.remove();
    };
  }, []);

  const enableBluetoothInDevice = () => {
    console.warn('en...');
    BleManager.enableBluetooth()

      .then(() => {
        console.warn('sc...');
        startScan();
      })

      .catch(error => {
        console.log('Sc Error--->', error);
      });
  };

  const startScan = () => {
    console.warn('st sc...');
    if (!isScanning) {
      BleManager.scan([], 5, true)
        .then(results => {
          console.log('Scanning...');

          setIsScanning(true);
        })
        .catch(err => {
          console.error(err);
        });
    }
  };

  const checkForBluetoothPermission = () => {
    console.warn('...');
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      let finalPermission =
        Platform.Version >= 29
          ? PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          : PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

      PermissionsAndroid.check(finalPermission).then(result => {
        if (result) {
          console.warn('en bt...');
          enableBluetoothInDevice();
        } else {
          PermissionsAndroid.request(finalPermission).then(result => {
            if (result) {
              console.warn('fp en bt...');
              enableBluetoothInDevice();
            } else {
              console.log('User refuse');
            }
          });
        }
      });
    } else {
      console.log('IOS');

      enableBluetoothInDevice();
    }
  };

  const requestBluetoothPermission = async () => {
    if (isAndroid12ORAbove()) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          checkBtStatusAndDiscover();
          console.log('You can use the Bluetooth');
        } else {
          //show error
          console.log('Camera permission denied');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      checkBtStatusAndDiscover();
    }
  };

  const checkBtStatusAndDiscover = async () => {
    //if (BleManager.checkState()) {
    if (isAndroid12ORAbove()) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          showPairedDevices();
          console.log('Scan perm granted');
        } else {
          //show error
          console.log('Bt scan permission denied');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      scanDevices();
    }
    //} else {
    //enableBluetooth();
    //}
    //scanDevices();
  };

  const enableBluetooth = () => {
    //scan devices on success
    BleManager.start({showAlert: false})
      .then(() => {
        // Success code
        console.log('Module initialized');
        scanDevices();
      })
      .catch(error => {
        // Failure code
        console.log('Err in Enable Device' + error);
      });
  };

  const scanDevices = () => {
    //show list on success
    BleManager.scan([], 30, true)
      .then(() => {
        // Success code
        console.log('Scan started');
        showPairedDevices();
      })
      .catch(error => {
        console.warn('Error in scan');
        console.warn(error);
        BleManager.stopScan().then(() => {
          // Success code
          console.log('Scan stopped');
        });
        // Failure code
      });
  };

  const showPairedDevices = () => {
    BleManager.getConnectedPeripherals([]).then(peripheralsArray => {
      // Success code
      console.log('Connected peripherals: ' + peripheralsArray.length);
    });
  };

  const startScan1 = () => {
    if (!isScanning) {
      BleManager.scan([], 30, true)
        .then(results => {
          console.log('Scanning...');
          setIsScanning(true);
        })
        .catch(err => {
          console.error(err);
        });
    }
  };

  const handleStopScan = () => {
    console.log('Scan is stopped');
    setIsScanning(false);
    BleManager.getBondedPeripherals([]).then(bondedPeripheralsArray => {
      // Each peripheral in returned array will have id and name properties
      console.warn(bondedPeripheralsArray);
      setList(bondedPeripheralsArray);
      console.log('Bonded peripherals: ' + bondedPeripheralsArray.length);
    });
  };

  const handleDisconnectedPeripheral = data => {
    console.warn('discovered data------------------');
    console.warn(data);
    console.warn('-------------------------------');
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = true;
      peripherals.set(peripheral.id, peripheral);
      setList(Array.from(peripherals.values()));
    }
    console.log('Disconnected from ' + data.peripheral);
  };

  const handleUpdateValueForCharacteristic = data => {
    console.log(
      'Received data from ' +
        data.peripheral +
        ' characteristic ' +
        data.characteristic,
      data.value,
    );
  };

  const retrieveConnected = () => {
    BleManager.getConnectedPeripherals([]).then(results => {
      if (results.length == 0) {
        console.log('No connected peripherals');
      }
      console.log(results);
      for (var i = 0; i < results.length; i++) {
        var peripheral = results[i];
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        setList(Array.from(peripherals.values()));
      }
    });
  };

  const handleDiscoverPeripheral = peripheral => {
    if (!peripheral.name) {
    }
    peripherals.set(peripheral.id, peripheral);
  };

  const testPeripheral = peripheral => {
    if (peripheral) {
      if (peripheral.connected) {
        BleManager.disconnect(peripheral.id);
      } else {
        BleManager.connect(peripheral.id)
          .then(() => {
            let p = peripherals.get(peripheral.id);
            if (p) {
              p.connected = true;
              peripherals.set(peripheral.id, p);
              setList(Array.from(peripherals.values()));
            }
            console.log('Connected to ' + peripheral.id);

            setTimeout(() => {
              /* Test read current RSSI value */
              BleManager.retrieveServices(peripheral.id).then(
                peripheralData => {
                  console.log('Retrieved peripheral services', peripheralData);

                  BleManager.readRSSI(peripheral.id).then(rssi => {
                    console.log('Retrieved actual RSSI value', rssi);
                    let p = peripherals.get(peripheral.id);
                    if (p) {
                      p.rssi = rssi;
                      peripherals.set(peripheral.id, p);
                      setList(Array.from(peripherals.values()));
                    }
                  });
                },
              );
            }, 900);
          })
          .catch(error => {
            console.log('Connection error', error);
          });
      }
    }
  };

  useEffect(() => {
    BleManager.start({showAlert: false, forceLegacy: true});

    bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );
    bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
    bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      handleDisconnectedPeripheral,
    );
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic,
    );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(result => {
        if (result) {
          console.log('Permission is OK');
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then(result => {
            if (result) {
              console.log('User accept');
            } else {
              console.log('User refuse');
            }
          });
        }
      });
    }

    return () => {
      console.log('unmount');
      bleManagerEmitter.removeListener(
        'BleManagerDiscoverPeripheral',
        handleDiscoverPeripheral,
      );
      bleManagerEmitter.removeListener('BleManagerStopScan', handleStopScan);
      bleManagerEmitter.removeListener(
        'BleManagerDisconnectPeripheral',
        handleDisconnectedPeripheral,
      );
      bleManagerEmitter.removeListener(
        'BleManagerDidUpdateValueForCharacteristic',
        handleUpdateValueForCharacteristic,
      );
    };
  }, []);

  const renderItem = item => {
    const color = item.connected ? 'green' : '#fff';
    return (
      <TouchableHighlight onPress={() => testPeripheral(item)}>
        <View
          style={[
            styles.row,
            {
              backgroundColor: color,
              marginBottom: 10,
              padding: 10,
              borderRadius: 50,
              borderColor: 'black',
              borderWidth: 1,
            },
          ]}>
          <Text
            style={{
              marginTop: 0,
              fontSize: 18,
              fontWeight: '700',
              textAlign: 'center',
              color: '#000',
              padding: 5,
            }}>
            {item.name}
          </Text>
          <Text
            style={{
              fontSize: 14,
              textAlign: 'center',
              color: '#333333',
              padding: 2,
            }}>
            ID: {item.id}
          </Text>
        </View>
      </TouchableHighlight>
    );
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          {global.HermesInternal == null ? null : (
            <View style={styles.engine}>
              <Text style={styles.footer}>Engine: Hermes</Text>
            </View>
          )}
          <View style={styles.body}>
            <View style={{margin: 10, display: 'none'}}>
              <Button
                title={'Turn Bluetooth'}
                onPress={() => checkForBluetoothPermission()}
              />
            </View>

            {list.length == 0 && (
              <View
                style={{
                  flex: 1,
                  marginTop: 100,
                  marginStart: 25,
                  marginEnd: 25,
                  marginBottom: 25,
                }}>
                <Text style={{textAlign: 'center'}}>No peripherals</Text>
              </View>
            )}
          </View>
        </ScrollView>
        {list && list.length > 0 && (
          <Text
            style={{
              fontSize: 20,
              color: 'black',
              textAlign: 'center',
              marginTop: 25,
            }}>
            Paired Devices
          </Text>
        )}
        <FlatList
          style={{
            marginTop: 25,
            marginStart: 25,
            marginEnd: 25,
            marginBottom: 25,
          }}
          data={list}
          renderItem={({item}) => renderItem(item)}
          keyExtractor={item => item.id}
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: StatusBar.currentHeight,
    backgroundColor: '#ecf0f1',
    padding: 8,
  },
  item: {
    margin: 24,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default App;
