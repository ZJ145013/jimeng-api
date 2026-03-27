import { SiteConfig } from './settings/SiteConfig';
import { TokenManager } from './settings/TokenManager';
import { ModelManager } from './settings/ModelManager';
import { DataSync } from './settings/DataSync';

export default function Settings() {
  return (
    <div className="min-h-screen bg-transparent p-6 sm:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8 pb-32">
        <header className="mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-500 bg-clip-text text-transparent">系统首选项</h1>
          <p className="text-gray-500 mt-2 font-medium">全局配置、账号集锦与云数据同步</p>
        </header>

        {/* 使用卡片式布局组织原本冗长混乱的 Settings 页面 */}
        <section>
          <SiteConfig />
        </section>

        <section>
          <TokenManager />
        </section>

        <section>
          <ModelManager />
        </section>

        <section>
          <DataSync />
        </section>
      </div>
    </div>
  );
}
