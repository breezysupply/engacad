import { CheckCircle2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useNow, useProgress, useStore } from '../../app/providers';
import { LEVEL_LABEL } from '../../components/Badges';
import { Markdown } from '../../components/Markdown';
import { exerciseById, reviewPromptsForSkill } from '../../content';
import { skillById } from '../../content/skills';
import type { Exercise, ReviewPrompt } from '../../curriculum/types';
import { promptForStep, REVIEW_INTERVALS_DAYS, type ReviewRecord } from '../../progress/model';
import type { GradedCheck } from '../../runtime/python/grading';
import { useExercise } from '../lesson/useExercise';
import { Workbench } from '../lesson/Workbench';

function ExerciseReview({ review, prompt, ex }: { review: ReviewRecord; prompt: ReviewPrompt; ex: Exercise }) {
  const store = useStore();
  const stateKey = `${ex.id}@${review.id}`;
  const [result, setResult] = useState<string | null>(null);
  const record = useCallback(
    (graded: GradedCheck, source: string) => {
      const { check, review: out } = store.recordReviewCheck(review.id, prompt.id, ex, source, graded, stateKey);
      if (out?.evidenceRecord) setResult(`${LEVEL_LABEL[out.evidenceRecord.level]} evidence recorded. ${out.evidenceRecord.note ?? ''}`);
      return check;
    },
    [store, review.id, prompt.id, ex, stateKey],
  );
  const ctl = useExercise(ex, stateKey, record);
  return (
    <div className="lesson-layout no-rail" style={{ gridTemplateColumns: 'minmax(0,1fr) 6px minmax(380px, 52%)' }}>
      <div className="lesson-main">
        <div className="lesson-main-inner">
          <ReviewHeader review={review} />
          <Markdown text={ex.prompt} />
          {result && (
            <div className="callout callout-tip" role="status">
              <div className="callout-title">
                <CheckCircle2 size={16} /> Review complete
              </div>
              {result} <Link to="/">Back to the dashboard</Link>
            </div>
          )}
          {!result && <p className="small muted">Use Check when ready. Failing is fine — the review stays available and nothing is penalised.</p>}
        </div>
      </div>
      <div className="splitter" aria-hidden />
      <Workbench ex={ex} stateKey={stateKey} ctl={ctl} />
    </div>
  );
}

function QuizReview({ review, prompt }: { review: ReviewRecord; prompt: Extract<ReviewPrompt, { kind: 'quiz' }> }) {
  const store = useStore();
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const answer = (i: number) => {
    setChosen(i);
    const out = store.recordReview(review.id, prompt.id, i === prompt.answerIndex, false, 'lesson');
    if (out?.evidenceRecord) setResult(`${LEVEL_LABEL[out.evidenceRecord.level]} evidence recorded (knowledge check).`);
  };
  return (
    <div className="page page-narrow">
      <ReviewHeader review={review} />
      <div className="quiz">
        <p>{prompt.question}</p>
        {prompt.options.map((o, i) => (
          <button
            key={o}
            className={`quiz-option ${chosen !== null && i === prompt.answerIndex && chosen === i ? 'correct' : chosen === i ? 'wrong' : ''}`}
            disabled={result !== null}
            onClick={() => answer(i)}
          >
            <span>{String.fromCharCode(65 + i)}.</span> <span>{o}</span>
          </button>
        ))}
        {chosen !== null && (
          <div className="callout callout-info small" role="status">
            <div className="callout-title">{chosen === prompt.answerIndex ? 'Correct' : 'Not quite — try again whenever you like'}</div>
            {chosen === prompt.answerIndex ? prompt.explanation : 'This review stays available. Re-read the explanation in Week 01 if useful.'}
          </div>
        )}
        {result && (
          <p className="small">
            {result} <Link to="/">Back to the dashboard</Link>
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewHeader({ review }: { review: ReviewRecord }) {
  const skill = skillById(review.skillId);
  return (
    <header style={{ marginBottom: 16 }}>
      <div className="eyebrow">
        Review · {REVIEW_INTERVALS_DAYS[review.step]}-day step ({review.step + 1} of {REVIEW_INTERVALS_DAYS.length})
      </div>
      <h1>{skill?.title ?? review.skillId}</h1>
      <p className="card-sub">{skill?.canDo}</p>
    </header>
  );
}

export function ReviewPage() {
  const { reviewId = '' } = useParams();
  const id = decodeURIComponent(reviewId);
  return <ReviewSession key={id} id={id} />;
}

function ReviewSession({ id }: { id: string }) {
  const state = useProgress();
  const now = useNow();
  const review = state.reviews[id];
  // A review completed during this visit keeps showing its results.
  const [openAtStart] = useState(() => !!review && !review.completedAt);
  if (!review) return <Navigate to="/progress" replace />;
  const prompt = promptForStep(reviewPromptsForSkill(review.skillId), review.step);
  if (!prompt) return <Navigate to="/progress" replace />;
  if (review.completedAt && !openAtStart)
    return (
      <div className="page page-narrow">
        <ReviewHeader review={review} />
        <p>This review was completed on {new Date(review.completedAt).toLocaleDateString()}.</p>
        <Link to="/progress">Back to Skills &amp; Progress</Link>
      </div>
    );
  if (review.dueAt > now)
    return (
      <div className="page page-narrow">
        <ReviewHeader review={review} />
        <p>This review becomes available on {new Date(review.dueAt).toLocaleDateString()}. Spacing it out is what makes it useful.</p>
        <Link to="/progress">Back to Skills &amp; Progress</Link>
      </div>
    );
  if (prompt.kind === 'exercise') {
    const ex = exerciseById(prompt.exerciseId)!;
    return <ExerciseReview key={review.id} review={review} prompt={prompt} ex={ex} />;
  }
  return <QuizReview key={review.id} review={review} prompt={prompt} />;
}
