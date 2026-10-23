import { useApp } from '../state/AppContext';
import { BackButton, EmptyState, ScreenHeader } from './common';

/** Body weight and measurements (filled in with package 5). */
export function BodyScreen() {
  const { goBack } = useApp();
  return (
    <div className="stack">
      <ScreenHeader start={<BackButton onClick={() => goBack({ name: 'workout' })} />} title="משקל גוף ומדידות" />
      <EmptyState title="בקרוב" />
    </div>
  );
}
