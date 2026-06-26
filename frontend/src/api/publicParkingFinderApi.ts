import {
  PublicParkingFinderQuery,
  PublicParkingFinderResult,
} from '../types/publicParkingFinder';
import { apiClient } from './client';

export async function getPublicParkingFinderResults(params: PublicParkingFinderQuery = {}) {
  const response = await apiClient.get<PublicParkingFinderResult[]>('/public/parking-finder', {
    params,
  });
  return response.data;
}