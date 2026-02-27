import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function LocationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Ubicaciones' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle' }} />
      <Stack.Screen name="add" options={{ title: 'Nueva Ubicación', presentation: 'modal' }} />
    </Stack>
  );
}
