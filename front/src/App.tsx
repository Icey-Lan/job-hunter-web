import { Briefcase } from 'lucide-react';
import { TaskSubmit } from './components/TaskSubmit';
import { StatusDashboard } from './components/StatusDashboard';
import { JobTable } from './components/JobTable';

function App() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-12">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-black/5 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black text-white rounded-xl shadow-lg shadow-blue-500/20">
              <Briefcase size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Job Hunter <span className="text-gray-400 font-normal">Pro</span></h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
            <span>v1.0.0</span>
            <span className="w-px h-4 bg-gray-300"></span>
            <span className="text-green-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Online</span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-10">
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">控制台 (Dashboard)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Input */}
              <div className="lg:col-span-1">
                <TaskSubmit />
              </div>

              {/* Right: Status */}
              <div className="lg:col-span-2">
                <StatusDashboard />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">岗位数据 (Jobs)</h2>
            <JobTable />
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
