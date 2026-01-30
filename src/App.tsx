import { useEffect } from 'react';
import { CurrentRoute } from '@/router';
import { initializeStorage } from '@/utils/storage';
import { Toaster } from '@/components/ui/sonner';

function App() {
  // 初始化存储
  useEffect(() => {
    initializeStorage();
  }, []);

  return (
    <>
      <CurrentRoute />
      <Toaster position="top-right" />
    </>
  );
}

export default App;
