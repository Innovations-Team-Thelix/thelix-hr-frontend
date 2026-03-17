"use client";

import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useClockIn } from '@/hooks/useAttendance';

interface ClockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLate: boolean;
}

export function ClockInModal({ isOpen, onClose, isLate }: ClockInModalProps) {
  const [workLocation, setWorkLocation] = useState<'Onsite' | 'Remote'>('Onsite');
  const [lateReason, setLateReason] = useState('');
  const { mutate: clockIn } = useClockIn();
  const [isPending, setIsPending] = useState(false);

  const handleClockIn = () => {
    setIsPending(true);
    clockIn(
      { workLocation: workLocation as 'Onsite' | 'Remote', lateReason: isLate ? lateReason : undefined },
      {
        onSuccess: () => {
          setIsPending(false);
          onClose();
          setWorkLocation('Onsite');
          setLateReason('');
        },
        onError: () => {
          setIsPending(false);
        }
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Clock In">
      <div className="space-y-4">
        <Select
          label="Work Mode"
          options={[
            { label: 'Onsite', value: 'Onsite' },
            { label: 'Remote', value: 'Remote' },
          ]}
          value={workLocation}
          onChange={(e) => setWorkLocation(e.target.value as 'Onsite' | 'Remote')}
        />
        {isLate && (
          <Textarea
            label="Late Reason"
            placeholder="Reason for being late..."
            value={lateReason}
            onChange={(e) => setLateReason(e.target.value)}
            required
          />
        )}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleClockIn} loading={isPending}>
          Confirm Clock In
        </Button>
      </div>
    </Modal>
  );
}
