/**
 * SimBrief Auto-Dispatch Integration
 * Automatically creates and submits SimBrief form with dispatch leg data
 * 
 * Location: lib/auto-dispatch.ts
 */

import SimBriefAPI from './simbrief.apiv1';

// Interface matching your dispatch leg structure
interface DispatchLeg {
  id: string;
  leg_number: number;
  status: string;
  callsign: string;
  tail_number: string | null;
  dispatch_group_id: string | null;
  aircraft_id: string;
  route: {
    id: string;
    flight_number: string;
    departure_airport: string;
    arrival_airport: string;
    distance_nm: number;
    estimated_time_hrs: number;
  };
  aircraft: {
    name: string;
    type_code: string;
    family: string;
  };
}

interface SimBriefFormData {
  // Required fields
  orig: string;
  dest: string;
  type: string;
  
  // Optional fields
  fltnum?: string;
  airline?: string;
  reg?: string;
  callsign?: string;
  route?: string;
  
  // Additional optional fields
  fl?: string;           // Flight level
  cruise?: string;       // Cruise speed
  pax?: string;          // Passengers
  cargo?: string;        // Cargo weight
  date?: string;         // Departure date
  deph?: string;         // Departure hour
  depm?: string;         // Departure minute
}

/**
 * Auto-dispatch a flight using SimBrief API
 * Creates form, fills it with dispatch leg data, and submits
 */
export class SimBriefAutoDispatch {
  private api: SimBriefAPI;
  private formId: string = 'sbapiform-auto';
  
  constructor(apiConfig?: { apiDir?: string }) {
    this.api = new SimBriefAPI({
      apiDir: apiConfig?.apiDir || '/api/simbrief/',
      formId: this.formId
    });
  }

  /**
   * Convert dispatch leg to SimBrief form data
   */
  private legToFormData(leg: DispatchLeg): SimBriefFormData {
    const flightNumber = leg.route.flight_number.replace(/\D/g, ''); // Extract digits only
    
    return {
      // Required
      orig: leg.route.departure_airport,
      dest: leg.route.arrival_airport,
      type: leg.aircraft.type_code,
      
      // Optional
      fltnum: flightNumber || '1234',
      airline: 'AFL', // Aeroflot - customize as needed
      reg: leg.tail_number || undefined,
      callsign: leg.callsign || undefined,
      
      // Auto-calculate flight level based on distance
      // Short flights: FL250-300, Medium: FL320-360, Long: FL370-410
      fl: this.calculateFlightLevel(leg.route.distance_nm),
      
      // Set cruise speed based on aircraft type
      cruise: this.getCruiseSpeed(leg.aircraft.type_code),
    };
  }

  /**
   * Calculate appropriate flight level based on distance
   */
  private calculateFlightLevel(distanceNm: number): string {
    if (distanceNm < 500) return '250';
    if (distanceNm < 1000) return '300';
    if (distanceNm < 2000) return '350';
    if (distanceNm < 3000) return '370';
    return '390';
  }

  /**
   * Get cruise speed for common aircraft types
   */
  private getCruiseSpeed(aircraftType: string): string {
    const speedMap: Record<string, string> = {
      'A320': 'M078',
      'A321': 'M078',
      'A319': 'M078',
      'B737': 'M078',
      'B738': 'M078',
      'B739': 'M078',
      'B77W': 'M084',
      'B777': 'M084',
      'B787': 'M085',
      'A333': 'M082',
      'A332': 'M082',
      'A359': 'M085',
      'A350': 'M085',
    };
    
    return speedMap[aircraftType] || 'M078'; // Default to M078
  }

  /**
   * Create form element with data
   */
  private createForm(formData: SimBriefFormData): HTMLFormElement {
    // Remove existing form if present
    const existingForm = document.getElementById(this.formId);
    if (existingForm) {
      existingForm.remove();
    }

    // Create new form
    const form = document.createElement('form');
    form.id = this.formId;
    form.style.display = 'none'; // Hidden form

    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }
    });

    // Append to body
    document.body.appendChild(form);
    
    return form;
  }

  /**
   * Main function: Auto-dispatch with SimBrief
   * @param leg - The dispatch leg to create flight plan for
   * @param outputPage - Where to redirect after flight plan is ready (optional)
   * @returns Promise that resolves when dispatch is initiated
   */
  public async dispatch(
    leg: DispatchLeg, 
    outputPage?: string
  ): Promise<void> {
    try {
      // Convert leg to form data
      const formData = this.legToFormData(leg);
      
      // Create and populate form
      this.createForm(formData);
      
      // Set default output page if not provided
      const redirect = outputPage || `/pirep?leg=${leg.id}`;
      
      // Submit to SimBrief
      this.api.submit(redirect);
      
      console.log('SimBrief dispatch initiated for leg:', leg.id);
    } catch (error) {
      console.error('Failed to auto-dispatch with SimBrief:', error);
      throw error;
    }
  }

  /**
   * Get SimBrief URL for manual access (fallback)
   */
  public getManualUrl(leg: DispatchLeg): string {
    const formData = this.legToFormData(leg);
    const params = new URLSearchParams({
      orig: formData.orig,
      dest: formData.dest,
      type: formData.type,
      fltnum: formData.fltnum || '',
      airline: formData.airline || '',
    });
    
    return `https://dispatch.simbrief.com/options/custom?${params.toString()}`;
  }
}

/**
 * Utility function for quick dispatch
 * Use this in your React component
 */
export const autoDispatchFlight = async (
  leg: DispatchLeg,
  options?: {
    apiDir?: string;
    outputPage?: string;
  }
): Promise<void> => {
  const dispatcher = new SimBriefAutoDispatch({
    apiDir: options?.apiDir
  });
  
  await dispatcher.dispatch(leg, options?.outputPage);
};

/**
 * React Hook for SimBrief integration
 */
export const useSimBriefDispatch = (apiDir?: string) => {
  const dispatcher = new SimBriefAutoDispatch({ apiDir });

  return {
    /**
     * Dispatch a flight with auto-filled form
     */
    dispatch: async (leg: DispatchLeg, outputPage?: string) => {
      return dispatcher.dispatch(leg, outputPage);
    },
    
    /**
     * Get manual SimBrief URL as fallback
     */
    getManualUrl: (leg: DispatchLeg) => {
      return dispatcher.getManualUrl(leg);
    }
  };
};

export default SimBriefAutoDispatch;
