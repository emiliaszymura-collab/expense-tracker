// Element sceny, który może się nie wczytać (model, tekstura, HDRI). Ładuje się osobno i niezależnie:
// dopóki się wczytuje albo gdy się nie uda, pokazuje się `zastepstwo` – reszta laboratorium działa normalnie.
import { Component, Suspense, type ReactNode } from 'react';

class Granica extends Component<{ zastepstwo: ReactNode; children: ReactNode }, { blad: boolean }> {
  state = { blad: false };
  static getDerivedStateFromError() {
    return { blad: true };
  }
  componentDidCatch(e: unknown) {
    console.warn('Nie wczytano elementu sceny:', e);
  }
  render() {
    return this.state.blad ? this.props.zastepstwo : this.props.children;
  }
}

export function Opcjonalnie({ children, zastepstwo = null }: { children: ReactNode; zastepstwo?: ReactNode }) {
  return (
    <Granica zastepstwo={zastepstwo}>
      <Suspense fallback={zastepstwo}>{children}</Suspense>
    </Granica>
  );
}
