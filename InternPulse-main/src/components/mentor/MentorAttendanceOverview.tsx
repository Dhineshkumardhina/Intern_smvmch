import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Check, 
  XCircle,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { AttendanceSessionRecord } from '../../data/initialData';
import { AuthUser } from '../../core/auth/authUser';

interface MentorAttendanceOverviewProps {
  currentUser: AuthUser;
  attendanceSessions: AttendanceSessionRecord[];
  onVerifySession?: (sessionId: string, isVerified: boolean, remarks?: string) => Promise<void>;
}

export const MentorAttendanceOverview: React.FC<MentorAttendanceOverviewProps> = ({
  currentUser,
  attendanceSessions,
  onVerifySession,
}) => {
  const mentorDept = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'CSEBS';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterVerification, setFilterVerification] = useState<string>('All');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Compute live analytics from sessions
  const metrics = useMemo(() => {
    const total = attendanceSessions.length;
    if (total === 0) {
      return { total: 0, presentCount: 0, verifiedCount: 0, flaggedCount: 0, avgHours: 0, presentRate: 0 };
    }
    const presentCount = attendanceSessions.filter(s => s.status === 'present' || s.status === 'half_day' || s.status === 'late').length;
    const verifiedCount = attendanceSessions.filter(s => s.isVerified && s.geofenceStatus === 'verified').length;
    const flaggedCount = attendanceSessions.filter(s => s.status === 'flagged' || s.geofenceStatus === 'out_of_bounds' || s.geofenceStatus === 'spoof_detected').length;
    const totalHours = attendanceSessions.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
    const avgHours = total > 0 ? (totalHours / total).toFixed(1) : '0';
    const presentRate = Math.round((presentCount / total) * 100);

    return { total, presentCount, verifiedCount, flaggedCount, avgHours, presentRate };
  }, [attendanceSessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return attendanceSessions.filter(sess => {
      if (filterStatus !== 'All' && sess.status !== filterStatus.toLowerCase()) {
        return false;
      }
      if (filterVerification === 'Verified' && !sess.isVerified) return false;
      if (filterVerification === 'Flagged' && sess.isVerified && sess.geofenceStatus !== 'out_of_bounds') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          sess.studentName.toLowerCase().includes(q) ||
          sess.studentId.toLowerCase().includes(q) ||
          (sess.locationName && sess.locationName.toLowerCase().includes(q)) ||
          sess.sessionDate.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [attendanceSessions, filterStatus, filterVerification, searchQuery]);

  const handleQuickVerify = async (sessionId: string, newStatus: boolean) => {
    if (!onVerifySession) return;
    try {
      await onVerifySession(sessionId, newStatus, newStatus ? 'Verified by Faculty Mentor' : 'Flagged for review');
      setActionSuccessMessage(newStatus ? 'Session marked as verified!' : 'Session flagged.');
      setTimeout(() => setActionSuccessMessage(null), 2000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update verification status.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
          <div className="text-[11px] font-semibold text-[#57657A]">Overall Present Rate</div>
          <div className="text-2xl font-bold text-[#1A1B22] mt-1">{metrics.presentRate}%</div>
          <div className="text-[10px] text-emerald-600 mt-1">{metrics.presentCount} of {metrics.total} recorded</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
          <div className="text-[11px] font-semibold text-[#57657A]">Average Daily Hours</div>
          <div className="text-2xl font-bold text-[#24389C] mt-1">{metrics.avgHours} hrs</div>
          <div className="text-[10px] text-[#57657A] mt-1">Per shift across cohort</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-700">Geofence Verified</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{metrics.verifiedCount}</div>
          <div className="text-[10px] text-emerald-600 mt-1">Spatial checks passed</div>
        </div>

        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm">
          <div className="text-[11px] font-semibold text-rose-800">Flagged / Out of Bounds</div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{metrics.flaggedCount}</div>
          <div className="text-[10px] text-rose-700 font-bold mt-1">Requires review</div>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E1EA] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#757684] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student, ID, facility..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] w-full focus:outline-none focus:border-[#24389C]"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-1.5 text-xs rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late Arrival</option>
            <option value="half_day">Half Day</option>
            <option value="flagged">Flagged</option>
          </select>

          <select
            value={filterVerification}
            onChange={(e) => setFilterVerification(e.target.value)}
            className="p-1.5 text-xs rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] font-medium"
          >
            <option value="All">All Verifications</option>
            <option value="Verified">Verified Only</option>
            <option value="Flagged">Flagged / Review</option>
          </select>
        </div>

        {(searchQuery || filterStatus !== 'All' || filterVerification !== 'All') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('All');
              setFilterVerification('All');
            }}
            className="text-xs font-semibold text-[#24389C] px-3 py-1.5 rounded-lg border border-[#E3E1EA] hover:bg-[#EFEDF6]"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-[#E3E1EA] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E3E1EA] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#24389C]" />
            <h4 className="font-bold text-sm text-[#1A1B22]">Daily Attendance & Geofence Verification Log</h4>
          </div>
          <span className="text-xs text-[#57657A]">Showing {filteredSessions.length} sessions</span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#57657A]">
            No attendance records match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EFEDF6] text-[#57657A] font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Session Date</th>
                  <th className="p-3">Student Intern</th>
                  <th className="p-3">Timings</th>
                  <th className="p-3">Total Hours</th>
                  <th className="p-3">Facility Location</th>
                  <th className="p-3">Geofence Status</th>
                  <th className="p-3">Mentor Verification</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E1EA]">
                {filteredSessions.map((s) => {
                  const isVerified = s.isVerified;
                  const isOutOfBounds = s.geofenceStatus === 'out_of_bounds' || s.geofenceStatus === 'spoof_detected';

                  return (
                    <tr key={s.id} className="hover:bg-[#FBF8FF] transition-colors">
                      <td className="p-3 font-mono font-medium text-[#1A1B22]">
                        {s.sessionDate}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-[#1A1B22]">{s.studentName}</div>
                        <div className="font-mono text-[10px] text-[#57657A]">{s.studentId} • {s.departmentCode}</div>
                      </td>

                      <td className="p-3 font-mono text-[11px] text-[#57657A]">
                        {s.checkInAt ? (
                          <span>{s.checkInAt} → {s.checkOutAt || 'In Shift'}</span>
                        ) : (
                          <span>Not Checked In</span>
                        )}
                      </td>

                      <td className="p-3 font-bold text-[#1A1B22]">
                        {s.totalHours} hrs
                      </td>

                      <td className="p-3">
                        <div className="flex items-center space-x-1 text-[#57657A]">
                          <MapPin className="w-3 h-3 text-[#24389C] shrink-0" />
                          <span className="truncate max-w-[140px]">{s.locationName || 'Approved Site'}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOutOfBounds
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : s.geofenceStatus === 'verified'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {s.geofenceStatus === 'verified' ? '✓ Within Geofence' : isOutOfBounds ? '⚠️ Out of Bounds' : '⏳ Pending'}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isVerified 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {isVerified ? '✓ Verified' : '○ Unverified'}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        {onVerifySession && (
                          <div className="flex items-center justify-end space-x-1">
                            {!isVerified ? (
                              <button
                                onClick={() => handleQuickVerify(s.id, true)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-[10px] border border-emerald-200 flex items-center space-x-1"
                                title="Approve and verify session"
                              >
                                <Check className="w-3 h-3" />
                                <span>Verify</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleQuickVerify(s.id, false)}
                                className="px-2 py-1 rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-100 font-bold text-[10px] border border-rose-200 flex items-center space-x-1"
                                title="Flag session for review"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Flag</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

