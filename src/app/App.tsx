import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ProgressStore } from '../progress/store';
import { BeaconPage } from '../features/beacon/BeaconPage';
import { LearnPage } from '../features/curriculum/LearnPage';
import { WeekPage } from '../features/curriculum/WeekPage';
import { Dashboard } from '../features/dashboard/Dashboard';
import { LabPage } from '../features/labs/LabPage';
import { LabsPage } from '../features/labs/LabsPage';
import { LessonPage } from '../features/lesson/LessonPage';
import { ProgressPage } from '../features/progress/ProgressPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { Layout } from './Layout';
import { ProgressProvider, ThemeEffect } from './providers';

// Hash routing keeps deep links working on GitHub Pages, which has no server-side rewrites.
export function App({ store }: { store: ProgressStore }) {
  return (
    <ProgressProvider store={store}>
      <ThemeEffect />
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="learn" element={<LearnPage />} />
            <Route path="learn/week/:weekId" element={<WeekPage />} />
            <Route path="learn/lesson/:lessonId" element={<LessonPage />} />
            <Route path="labs" element={<LabsPage />} />
            <Route path="labs/:labId" element={<LabPage />} />
            <Route path="beacon" element={<BeaconPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="review/:reviewId" element={<ReviewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ProgressProvider>
  );
}
