"use client";
import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Calendar, Loader2, ArrowRight, TrendingUp, Award, Target, Zap, BookOpen, Brain } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const motivationalQuotes = [
  "Keep pushing forward! 💪",
  "Every expert was once a beginner 🌟",
  "Small progress is still progress 🚀",
  "You're doing amazing! Keep it up! ⭐",
  "Consistency beats perfection 🎯",
  "Your future self will thank you 🙌",
  "Learning today, leading tomorrow 📚",
  "Stay focused and never give up! 🔥"
];

export default function DashboardContent({ user, onViewSchedule }: { user: any, onViewSchedule?: (id: number) => void }) {
  const [loading, setLoading] = useState(true);
  
  // --- HYDRATION FIX: Track if component is mounted ---
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  const [quote, setQuote] = useState(motivationalQuotes[0]);
  const [userName, setUserName] = useState<string>("Student");
  
  const [stats, setStats] = useState({
    totalSchedules: 0,
    pendingTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
    lastActive: "Just now",
    studyStreak: 0,
    weeklyGoal: 75,
    completionRate: 0,
    quizzesCompleted: 0
  });
  const [recentSchedules, setRecentSchedules] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // 1. Client-Side Only Logic
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    const quoteTimer = setInterval(() => {
      setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    }, 10000);
    
    return () => {
      clearInterval(timer);
      clearInterval(quoteTimer);
    };
  }, []);

  // 2. Fetch Data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Get fresh user data to ensure we have the ID
        const { data: authData } = await supabase.auth.getUser();
        const activeUser = authData?.user || user;

        if (!activeUser?.id) return;

        // --- FETCH NAME ---
        const metaName = activeUser.user_metadata?.full_name || activeUser.user_metadata?.name;
        const emailName = activeUser.email?.split('@')[0];
        setUserName(metaName || emailName || "Student");

        // --- FETCH SCHEDULES ---
        const { data: schedules, error: scheduleError } = await supabase
          .from('schedules')
          .select('*')
          .eq('user_id', activeUser.id)
          .order('created_at', { ascending: false });

        if (scheduleError) {
          console.warn("Error loading schedules:", scheduleError.message);
        }

        const safeSchedules = schedules || [];
        
        // Calculate Schedule Stats
        let totalPending = 0;
        let totalCompleted = 0;
        let totalTasks = 0;
        const activities: any[] = [];

        safeSchedules.forEach((schedule) => {
          if (schedule.content && Array.isArray(schedule.content)) {
            schedule.content.forEach((task: any) => {
              totalTasks++;
              const status = String(task.status || '').trim().toUpperCase();
              if (status === 'PENDING') totalPending++;
              if (status === 'COMPLETED' || status === 'DONE') totalCompleted++;
            });
            
            activities.push({
              type: 'schedule',
              name: schedule.name || 'Untitled Schedule',
              date: schedule.created_at,
              itemCount: schedule.content.length
            });
          }
        });

        // --- FETCH QUIZ RESULTS ---
        // We use 'quiz_results' table, NOT 'quiz_attempts'
        const { data: quizResults, error: quizError } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_id', activeUser.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (quizError) {
          // Just warn, don't break the dashboard if quizzes fail
          console.warn("Error loading quizzes:", quizError.message); 
        }

        if (quizResults && quizResults.length > 0) {
          quizResults.forEach((quiz) => {
            activities.push({
              type: 'quiz',
              // Use 'topic' because that's what we defined in the schema
              name: quiz.topic ? `Quiz: ${quiz.topic}` : 'Quiz Completed',
              date: quiz.created_at,
              score: quiz.score,
              total: quiz.total_questions
            });
          });
        }

        // Sort & Slice Activity
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivity(activities.slice(0, 2));

        const latestSchedule = safeSchedules[0];
        const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
        
        // Calculate Streak - Fixed logic for consecutive days
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison
        let streak = 0;
        
        // Check if there's activity today first - streak must include today
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          
          // Check for ANY activity on this date (schedules, quizzes, etc.)
          const hasScheduleActivity = safeSchedules.some(s => {
            const scheduleDate = new Date(s.created_at);
            scheduleDate.setHours(0, 0, 0, 0);
            return scheduleDate.getTime() === checkDate.getTime();
          });
          
          const hasQuizActivity = quizResults?.some(q => {
            const quizDate = new Date(q.created_at);
            quizDate.setHours(0, 0, 0, 0);
            return quizDate.getTime() === checkDate.getTime();
          }) || false;
          
          const hasActivity = hasScheduleActivity || hasQuizActivity;
          
          if (hasActivity) {
            streak++;
          } else {
            // Break immediately when we hit a day without activity
            break;
          }
        }
        
        setStats({
          totalSchedules: safeSchedules.length,
          pendingTasks: totalPending,
          completedTasks: totalCompleted,
          totalTasks: totalTasks,
          lastActive: latestSchedule ? new Date(latestSchedule.created_at).toLocaleDateString() : "No activity",
          studyStreak: streak,
          weeklyGoal: 75,
          completionRate: completionRate,
          quizzesCompleted: quizResults?.length || 0
        });

        setRecentSchedules(safeSchedules.slice(0, 2));

      } catch (err: any) {
        console.error("Dashboard logic error:", err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  // Helpers for display
  const getGreeting = () => {
    if (!currentTime) return "Welcome";
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getTimeString = () => {
    if (!currentTime) return "";
    return currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getDateString = () => {
    if (!currentTime) return "";
    return currentTime.toLocaleDateString();
  };

  if (!mounted) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Dynamic Welcome Banner */}
      <div className="bg-gradient-to-br from-indigo-700 via-purple-600 to-indigo-800 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-indigo-200" />
            <span className="text-indigo-200 text-sm font-medium">
              {getTimeString()} • {getDateString()}
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-3 tracking-tight">
            {getGreeting()}, {userName}! 🚀
          </h1>
          <p className="text-indigo-100 text-sm md:text-lg font-medium opacity-90 max-w-md mb-3">
            {quote}
          </p>
          {stats.studyStreak > 0 && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-bold">{stats.studyStreak} Day Streak! 🔥</span>
            </div>
          )}
        </div>
        <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Completion Rate" 
          value={loading ? "..." : `${stats.completionRate}%`} 
          sub={`${stats.completedTasks} of ${stats.totalTasks} tasks`}
          color="text-emerald-500" 
          bg="bg-emerald-50" 
          icon={<Target />}
          progress={stats.completionRate}
        />
        <StatCard 
          title="Pending Tasks" 
          value={loading ? "..." : `${stats.pendingTasks}`} 
          sub="Tasks to complete" 
          color="text-orange-500" 
          bg="bg-orange-50" 
          icon={<Clock />} 
        />
        <StatCard 
          title="Study Streak" 
          value={loading ? "..." : `${stats.studyStreak} Days`} 
          sub="Keep the momentum!" 
          color="text-purple-500" 
          bg="bg-purple-50" 
          icon={<TrendingUp />} 
        />
        <StatCard 
          title="Total Plans" 
          value={loading ? "..." : `${stats.totalSchedules}`} 
          sub={`${stats.quizzesCompleted} quizzes completed`}
          color="text-blue-500" 
          bg="bg-blue-50" 
          icon={<BookOpen />} 
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Schedules */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-xl text-slate-800">Recent Plans</h3>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Access</span>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-300" /></div>
            ) : recentSchedules.length > 0 ? (
              recentSchedules.map((schedule) => (
                <ActionItem 
                  key={schedule.id}
                  title={schedule.name || "Untitled Schedule"} 
                  desc={`Created ${new Date(schedule.created_at).toLocaleDateString()} • ${schedule.content?.length || 0} items`} 
                  color="blue"
                  onClick={() => onViewSchedule && onViewSchedule(schedule.id)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 italic">No schedules found. Create your first one!</div>
            )}
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-xl text-slate-800">Recent Activity</h3>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Feed</span>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-300" /></div>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 italic">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      {!loading && stats.totalTasks > 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 md:p-8 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-6 h-6 text-indigo-600" />
            <h3 className="font-bold text-xl text-slate-800">Your Progress</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ProgressCard
              label="Completed"
              value={stats.completedTasks}
              total={stats.totalTasks}
              color="bg-emerald-500"
            />
            <ProgressCard
              label="Pending"
              value={stats.pendingTasks}
              total={stats.totalTasks}
              color="bg-orange-500"
            />
            <ProgressCard
              label="Success Rate"
              value={stats.completionRate}
              total={100}
              color="bg-indigo-500"
              suffix="%"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, sub, color, bg, icon, progress }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
          <h3 className={`text-2xl md:text-3xl font-black ${color} group-hover:scale-105 transition-transform`}>{value}</h3>
        </div>
        <div className={`p-3 ${bg} rounded-2xl ${color} group-hover:rotate-12 transition-transform`}>{icon}</div>
      </div>
      <p className="text-xs text-slate-500 font-medium">{sub}</p>
      {progress !== undefined && (
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-500`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ActionItem({ title, desc, color, onClick }: any) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all group cursor-pointer">
      <div className={`w-2 h-10 sm:h-12 rounded-full ${color === 'orange' ? 'bg-orange-400' : 'bg-indigo-500'} group-hover:h-14 transition-all`} />
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{title}</h4>
        <p className="text-sm text-slate-500 font-medium">{desc}</p>
      </div>
      <button onClick={onClick} className="whitespace-nowrap px-6 py-2 bg-white text-slate-700 font-bold text-xs rounded-xl border border-slate-200 hover:bg-slate-900 hover:text-white transition-colors flex items-center gap-2">
        View <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

function ActivityItem({ activity }: any) {
  const isQuiz = activity.type === 'quiz';
  const icon = isQuiz ? <Brain className="w-4 h-4" /> : <Calendar className="w-4 h-4" />;
  const bgColor = isQuiz ? 'bg-purple-50' : 'bg-blue-50';
  const textColor = isQuiz ? 'text-purple-600' : 'text-blue-600';
  
  // Calculate time ago safely inside the component render
  const timeAgo = (() => {
    const seconds = Math.floor((new Date().getTime() - new Date(activity.date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(activity.date).toLocaleDateString();
  })();

  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl hover:bg-white transition-colors border border-slate-100">
      <div className={`p-2 ${bgColor} ${textColor} rounded-lg`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-slate-800 truncate">{activity.name}</h4>
        <p className="text-xs text-slate-500 mt-1">
          {isQuiz 
            ? `Score: ${activity.score}/${activity.total} • ${timeAgo}`
            : `${activity.itemCount} tasks • ${timeAgo}`
          }
        </p>
      </div>
      {isQuiz && activity.score && activity.total && (
        <div className="text-xs font-bold text-purple-600">
          {Math.round((activity.score / activity.total) * 100)}%
        </div>
      )}
    </div>
  );
}

function ProgressCard({ label, value, total, color, suffix = '' }: any) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-bold text-slate-600">{label}</span>
        <span className="text-2xl font-black text-slate-800">{value}{suffix}</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">{percentage}% of total</p>
    </div>
  );
}