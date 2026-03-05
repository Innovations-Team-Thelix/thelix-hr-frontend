"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClockInModal } from './clock-in-modal';
import { useAttendance, useClockOut } from '@/hooks/useAttendance';
import { useAuthStore } from '@/hooks';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

export function ClockInWidget() {
  const { user } = useAuthStore();
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  
  // Fetch both yesterday and today to handle timezone offsets and overnight shifts
  const { data: attendanceRecords, isLoading, refetch } = useAttendance({
    startDate: yesterday,
    endDate: today,
  });

  const { mutate: clockOut, isPending: isClockOutPending } = useClockOut();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Filter by employeeId — for Admin/SBUHead the query returns all
  // employees' records, so we must match the current user's own record.
  // Prioritize finding an active session (clocked in but not out).
  let todayRecord = attendanceRecords?.find(
    (r) =>
      String(r.employeeId) === String(user?.employeeId) &&
      !r.clockOutTime
  );

  // If no active session, find the latest record for today
  if (!todayRecord) {
     todayRecord = attendanceRecords?.find(
        (r) =>
          String(r.employeeId) === String(user?.employeeId) &&
          dayjs(r.date).format('YYYY-MM-DD') === today
     );
  }

  const isClockedIn = !!todayRecord?.clockInTime && !todayRecord?.clockOutTime;
  const isClockedOut = !!todayRecord?.clockOutTime;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isClockedIn && todayRecord?.clockInTime) {
      const updateTimer = () => {
        const now = dayjs();
        const start = dayjs(todayRecord.clockInTime);
        const diffMs = now.diff(start);
        
        if (diffMs < 0) {
          setElapsedTime('00:00:00');
          return;
        }

        const diff = dayjs.duration(diffMs);
        const hours = String(Math.floor(diff.asHours())).padStart(2, '0');
        setElapsedTime(`${hours}:${String(diff.minutes()).padStart(2, '0')}:${String(diff.seconds()).padStart(2, '0')}`);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else if (isClockedOut && todayRecord?.clockInTime && todayRecord?.clockOutTime) {
      // Show total worked time (static)
      const diff = dayjs.duration(dayjs(todayRecord.clockOutTime).diff(dayjs(todayRecord.clockInTime)));
      const hours = String(Math.floor(diff.asHours())).padStart(2, '0');
      setElapsedTime(`${hours}:${String(diff.minutes()).padStart(2, '0')}:${String(diff.seconds()).padStart(2, '0')}`);
    } else {
      setElapsedTime('00:00:00');
    }

    return () => { if (interval) clearInterval(interval); };
  }, [isClockedIn, isClockedOut, todayRecord?.clockInTime, todayRecord?.clockOutTime]);

  const handleClockOut = () => {
    clockOut();
  };
  
  // Logic to determine if late (e.g. after 9:15 AM with grace period)
  const now = dayjs();
  const isLate = (now.hour() > 9) || (now.hour() === 9 && now.minute() > 15);

  if (isLoading) {
    return (
        <Card>
            <CardContent className="p-6">Loading...</CardContent>
        </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Time Tracker</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          {isClockedOut ? (
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Time</p>
              <div className="text-3xl font-mono font-bold text-emerald-600">{elapsedTime}</div>
              <p className="text-xs text-gray-400">
                {dayjs(todayRecord!.clockInTime).format('HH:mm')} → {dayjs(todayRecord!.clockOutTime).format('HH:mm')}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {isClockedIn ? 'Time Elapsed' : 'Ready to clock in'}
              </p>
              <div className="text-3xl font-mono font-bold text-primary">{elapsedTime}</div>
              {isClockedIn && todayRecord?.clockInTime && (
                <p className="text-xs text-gray-400">
                  Clocked in at {dayjs(todayRecord.clockInTime).format('HH:mm')}
                </p>
              )}
            </>
          )}

          <div className="flex gap-4 w-full justify-center">
            {!isClockedIn && !isClockedOut && (
              <Button onClick={() => setIsModalOpen(true)} className="w-full">
                Clock In
              </Button>
            )}
            {isClockedIn && (
              <Button variant="danger" onClick={handleClockOut} loading={isClockOutPending} className="w-full">
                Clock Out
              </Button>
            )}
            {isClockedOut && (
              <div className="text-sm text-emerald-600 font-medium">Done for today</div>
            )}
          </div>
        </CardContent>
      </Card>

      <ClockInModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        isLate={isLate}
      />
    </>
  );
}
