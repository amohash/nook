import { EmptyState } from '../../components';
import type { PlaceMapProps } from './PlaceMap.types';
export function PlaceMap({onFallback}: PlaceMapProps) {
  return <EmptyState title="Use the list on web" message="The interactive native map is available in Expo Go. The list uses the same recommendations."
    action={{label: 'Use list', onPress: onFallback}} />;
}
