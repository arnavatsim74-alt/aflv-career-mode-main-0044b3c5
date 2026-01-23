/*
 * SimBrief API Backend Module
 * For use with VA Dispatch systems
 * Converted from PHP to TypeScript
 * Original by Derek Mayer - contact@simbrief.com
 *
 * This module should be implemented as API routes in your backend framework
 * (Express.js, Next.js API routes, etc.)
 */

import crypto from 'crypto';

// Configuration
const SIMBRIEF_API_KEY = process.env.SIMBRIEF_API_KEY || 'PASTEHERE';

// Interfaces
export interface OFPData {
  ofpId: string;
  ofpAvail: boolean;
  ofpObj: any | null;
  ofpRawXml: string | null;
  ofpJson: string | null;
  ofpArray: any | null;
}

/**
 * SimBrief class for fetching and processing flight plans
 */
export class SimBrief {
  private ofpId: string | null;
  private ofpAvail: boolean = false;
  private ofpObj: any | null = null;
  private ofpRawXml: string | null = null;
  private ofpJson: string | null = null;
  private ofpArray: any | null = null;

  constructor(ofpId?: string) {
    this.ofpId = ofpId || null;
    
    if (this.ofpId) {
      this.fetchOFP();
    }
  }

  /**
   * Check if a URL/file exists
   */
  private async fileExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch the OFP (Operational Flight Plan) data
   */
  private async fetchOFP(): Promise<void> {
    if (!this.ofpId) {
      return;
    }

    // Validate OFP ID format (e.g., "1394916722_c9Vfm2W26V")
    const ofpIdPattern = /^\d{10}_[A-Za-z0-9]{10}$/;
    if (this.ofpId.length !== 21 || !ofpIdPattern.test(this.ofpId)) {
      return;
    }

    // Construct URL
    const url = `http://www.simbrief.com/ofp/flightplans/xml/${this.ofpId}.xml`;

    // Check if file exists
    const exists = await this.fileExists(url);
    if (!exists) {
      return;
    }

    // Fetch XML data
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return;
      }

      const xmlData = await response.text();
      this.ofpRawXml = xmlData;

      // Parse XML (you'll need an XML parser library like 'xml2js' or 'fast-xml-parser')
      // For this example, we'll store raw XML and let the consumer parse it
      // In production, you'd parse it here:
      
      // Example with xml2js (install: npm install xml2js @types/xml2js)
      // const parseString = require('xml2js').parseString;
      // parseString(xmlData, (err: any, result: any) => {
      //   if (!err) {
      //     this.ofpObj = result;
      //     this.ofpJson = JSON.stringify(result);
      //     this.ofpArray = result;
      //   }
      // });

      // For now, just mark as available if we got the raw XML
      if (this.ofpRawXml) {
        this.ofpAvail = true;
        // You should implement actual XML parsing here
        this.ofpJson = JSON.stringify({ raw: xmlData });
        this.ofpArray = { raw: xmlData };
      }
    } catch (error) {
      console.error('Error fetching OFP:', error);
    }
  }

  /**
   * Get OFP data
   */
  public getData(): OFPData {
    return {
      ofpId: this.ofpId || '',
      ofpAvail: this.ofpAvail,
      ofpObj: this.ofpObj,
      ofpRawXml: this.ofpRawXml,
      ofpJson: this.ofpJson,
      ofpArray: this.ofpArray
    };
  }

  /**
   * Check if OFP is available
   */
  public isAvailable(): boolean {
    return this.ofpAvail;
  }
}

/**
 * API Route: Check if OFP file exists
 * GET /api/simbrief/check?js_url_check=<ofp_id>&var=<variable_name>
 */
export async function handleFileCheck(
  ofpId: string,
  varName: string = 'phpvar'
): Promise<string> {
  const url = `http://www.simbrief.com/ofp/flightplans/xml/${ofpId}.xml`;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const exists = response.ok;
    
    // Return JavaScript that sets a global variable
    return `var ${varName} = "${exists ? 'true' : 'false'}";`;
  } catch {
    return `var ${varName} = "false";`;
  }
}

/**
 * API Route: Generate API code
 * GET /api/simbrief/code?api_req=<request_string>
 */
export function handleApiCode(apiRequest: string): string {
  const md5Hash = crypto
    .createHash('md5')
    .update(SIMBRIEF_API_KEY + apiRequest)
    .digest('hex');
  
  // Return JavaScript that sets the api_code variable
  return `var api_code = "${md5Hash}";`;
}

/**
 * Example Express.js route implementations
 * 
 * app.get('/api/simbrief/check', async (req, res) => {
 *   const { js_url_check, var: varName } = req.query;
 *   const script = await handleFileCheck(js_url_check as string, varName as string);
 *   res.setHeader('Content-Type', 'application/javascript');
 *   res.send(script);
 * });
 * 
 * app.get('/api/simbrief/code', (req, res) => {
 *   const { api_req } = req.query;
 *   const script = handleApiCode(api_req as string);
 *   res.setHeader('Content-Type', 'application/javascript');
 *   res.send(script);
 * });
 * 
 * app.get('/api/simbrief/ofp', async (req, res) => {
 *   const { ofp_id } = req.query;
 *   const simbrief = new SimBrief(ofp_id as string);
 *   // Wait for fetch to complete
 *   await new Promise(resolve => setTimeout(resolve, 1000));
 *   res.json(simbrief.getData());
 * });
 */

export default SimBrief;