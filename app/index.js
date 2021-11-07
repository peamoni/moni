import Bugsnag from "@bugsnag/react-native";
Bugsnag.start();

/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';

Ionicons.loadFont();

AppRegistry.registerComponent(appName, () => App);
