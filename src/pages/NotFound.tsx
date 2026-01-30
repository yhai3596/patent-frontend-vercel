import React from 'react';
import { navigate } from '@/router';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-12 h-12 text-gray-500" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          404
        </h1>
        
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          页面未找到
        </h2>
        
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          您访问的页面不存在或已被移除。请检查URL是否正确，或返回首页。
        </p>
        
        <div className="flex items-center justify-center gap-4">
          <Button onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          
          <Button variant="outline" onClick={() => window.history.back()}>
            返回上一页
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
