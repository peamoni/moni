import * as React from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import DashboardScreen from './Dashboard';
import ScreenerScreen from './Screener';
import SearchScreen from './Search';
import {createStackNavigator} from '@react-navigation/stack';
import InstrumentScreen from './Instrument';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useTheme} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {sml} from './utils/SizeTool';
import DrawerScreen from './Drawer';
import NotificationsScreen from './Notifications';
const {width} = Dimensions.get('window');
import * as Haptic from './utils/Haptic';

/* User authenticated first screen, is a simple tab bar container, with some customization */

const styles = StyleSheet.create({
  tabbarContainer: {
    flexDirection: 'row',
    height: sml(80, 90, 100),
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: sml(30, 35, 40),
    borderTopRightRadius: sml(30, 35, 40),
  },
});

// Custom tab bar
function MyTabBar({state, descriptors, navigation}: any) {
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  const {dark, colors} = useTheme();
  const insets = useSafeAreaInsets();
  if (focusedOptions.tabBarVisible === false) {
    return null;
  }

  return (
    <View style={{backgroundColor: colors.background}}>
      <View style={[styles.tabbarContainer, {backgroundColor: colors.card}]}>
        {state.routes.map((route: any, index: any) => {
          const {options} = descriptors[route.key];
          const icon =
            route.name === 'Dashboard'
              ? 'wallet-outline'
              : route.name === 'Screener'
              ? 'flashlight-outline'
              : route.name === 'Search'
              ? 'search-outline'
              : 'barbell-outline';

          const isFocused = state.index === index;

          const onPress = () => {
            Haptic.heavy();

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={isFocused ? {selected: true} : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{
                width: sml(80, 90, 100),
                alignItems: 'center',
                paddingBottom: insets.bottom,
              }}
              key={'test' + index}>
              <Ionicons
                name={icon}
                size={sml(32, 34, 36)}
                color={
                  isFocused ? colors.primary : dark ? '#999999' : '#373737'
                }
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Contains modal and tab view
const RootStack = createStackNavigator();
function RootStackScreen() {
  return (
    <RootStack.Navigator
      mode="modal"
      screenOptions={{
        gestureEnabled: true,
        headerShown: false,
        cardStyle: {backgroundColor: 'transparent'},
        cardOverlayEnabled: true,
        cardStyleInterpolator: ({current: {progress}}) => ({
          cardStyle: {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
          overlayStyle: {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
              extrapolate: 'clamp',
            }),
          },
        }),
      }}>
      <RootStack.Screen
        name="Home"
        component={HomeScreen}
        options={{headerShown: false}}
      />
      <RootStack.Screen name="Instrument" component={InstrumentScreen} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} />
    </RootStack.Navigator>
  );
}

// Containes tab
const Tab = createBottomTabNavigator();
function HomeScreen() {
  return (
    <Tab.Navigator tabBar={props => <MyTabBar {...props} />}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Screener" component={ScreenerScreen} />
    </Tab.Navigator>
  );
}

const Drawer = createDrawerNavigator();
// Add drawer
export default function LoggedScreen() {
  return (
    <Drawer.Navigator
      drawerContent={props => <DrawerScreen {...props} />}
      // edgeWidth={0}
      sceneContainerStyle={{backgroundColor: 'transparent'}}
      drawerStyle={{width, backgroundColor: 'transparent'}}>
      <Drawer.Screen name="RootHome" component={RootStackScreen} />
    </Drawer.Navigator>
  );
}
