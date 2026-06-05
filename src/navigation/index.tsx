import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import SelecaoTimeScreen from '../screens/SelecaoTimeScreen';
import PartidaScreen from '../screens/PartidaScreen';
import ResultadoScreen from '../screens/ResultadoScreen';
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  SelecaoTime: undefined;
  Partida: undefined;
  Resultado: { vencedorId: 1 | 2; nomeVencedor: string };
  Configuracoes: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SelecaoTime" component={SelecaoTimeScreen} />
        <Stack.Screen name="Partida" component={PartidaScreen} />
        <Stack.Screen name="Resultado" component={ResultadoScreen} />
        <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
