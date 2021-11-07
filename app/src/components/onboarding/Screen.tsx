import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {sml} from '../../utils/SizeTool';

import LinearGradient from 'react-native-linear-gradient';
import {themeToGradient} from '../../utils/Themes';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    padding: sml(50, 55, 60),
    paddingTop: sml(80, 115, 150),
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 500,
    borderColor: 'white',
    borderWidth: 4,
    padding: sml(10, 15, 20),
  },
  title: {
    fontSize: sml(24, 28, 32),
    color: 'white',
    textAlign: 'center',
    marginVertical: 16,
    fontFamily: 'Poppins-Bold',
  },
  description: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
});

export interface SlideProps {
  slide: {
    color: string;
    title: string;
    description: string;
    icon: string;
  };
}

const Screen = ({slide: {color, title, description, icon}}: SlideProps) => {
  const gradient = themeToGradient(color);
  return (
    <LinearGradient
      colors={gradient}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      style={{flex: 1}}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={sml(64, 74, 84)} color={'white'} />
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

export default Screen;
