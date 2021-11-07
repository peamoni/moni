import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';

declare const global: { HermesInternal: null | {} };

import { AppProvider } from "./src/context/context";
import Navigation from './src/Navigation';

const App = () => {
  return (
    <AppProvider>
      <StatusBar backgroundColor="transparent" translucent></StatusBar>
      <Navigation></Navigation>
    </AppProvider>
  );
};

const styles = StyleSheet.create({});

export default App;
