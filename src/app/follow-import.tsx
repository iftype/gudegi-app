import { router } from 'expo-router';
import { useState } from 'react';

import { FollowImportLogin } from '@/features/follow-import/follow-import-login';
import { FollowImportReview } from '@/features/follow-import/follow-import-review';
import type { FollowedChannel } from '@/types';

export default function FollowImportScreen() {
  const [channels, setChannels] = useState<FollowedChannel[] | null>(null);

  if (!channels) {
    return <FollowImportLogin onClose={() => router.back()} onImported={setChannels} />;
  }

  return <FollowImportReview channels={channels} onClose={() => router.back()} />;
}
