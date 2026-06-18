import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { serverUrl, accessToken } = useAuthStore();
  
  if (!serverUrl) {
    return <Redirect href="/server-setup" />;
  }
  
  if (!accessToken) {
    return <Redirect href="/login" />;
  }
  
  return <Redirect href="/home" />;
}