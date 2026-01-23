/*
 * SimBrief APIv1 TypeScript Module
 * For use with VA Dispatch systems
 * Converted from original by Derek Mayer - contact@simbrief.com
 * 
 * Location: lib/simbrief.apiv1.ts
 *
 * Any individual wishing to make use of this class must first contact
 * SimBrief to obtain a unique API key; without which it will be impossible
 * to connect to the API.
 */

// API Configuration
interface SimBriefConfig {
  apiDir?: string;
  formId?: string;
  workerUrl?: string;
  workerId?: string;
  callerId?: string;
  workerStyle?: string;
}

// URL Object interface
interface UrlObject {
  protocol: string;
  hostname: string;
  host: string;
  port: string;
  hash: string;
  pathname: string;
  search: string;
  parameters: Record<string, string | number | string[]>;
}

class SimBriefAPI {
  private config: Required<SimBriefConfig>;
  private worker: Window | null = null;
  private loopInterval: number | null = null;
  private ofpId: string | null = null;
  private outputPageSave: string | null = null;
  private outputPageCalc: string | null = null;
  private feResult: string | null = null;
  private timestamp: number | null = null;
  private apiCode: string | null = null;

  constructor(config: SimBriefConfig = {}) {
    this.config = {
      apiDir: config.apiDir || '',
      formId: config.formId || 'sbapiform',
      workerUrl: config.workerUrl || 'https://www.simbrief.com/ofp/ofp.loader.api.php',
      workerId: config.workerId || 'SBworker',
      callerId: config.callerId || 'SBcaller',
      workerStyle: config.workerStyle || 'width=600,height=315'
    };
  }

  /**
   * Main submission function
   * Collects form data and submits to SimBrief
   */
  public submit(outputPage?: string): void {
    // Clean up any prior requests
    if (this.worker) {
      this.worker.close();
    }

    if (this.loopInterval !== null) {
      window.clearInterval(this.loopInterval);
    }

    this.apiCode = null;
    this.ofpId = null;
    this.feResult = null;
    this.timestamp = null;
    this.outputPageSave = null;
    this.outputPageCalc = null;

    this.doSubmit(outputPage);
  }

  /**
   * Internal submission handler
   */
  private doSubmit(outputPage?: string): void {
    // Set default output page to current location
    if (!outputPage) {
      outputPage = window.location.href;
    }

    if (!this.timestamp) {
      this.timestamp = Math.round(Date.now() / 1000);
    }

    this.outputPageSave = outputPage;
    this.outputPageCalc = outputPage.replace('http://', '');

    // Load API code if not set
    if (!this.apiCode || this.apiCode === 'notset') {
      if (!this.apiCode) {
        this.apiCode = 'notset';
        const form = document.getElementById(this.config.formId) as HTMLFormElement;
        const orig = (form.elements.namedItem('orig') as HTMLInputElement).value;
        const dest = (form.elements.namedItem('dest') as HTMLInputElement).value;
        const type = (form.elements.namedItem('type') as HTMLInputElement).value;
        
        this.loadApiCode(
          `${this.config.apiDir}api/simbrief/code?api_req=${orig}${dest}${type}${this.timestamp}${this.outputPageCalc}`
        );
      }
      setTimeout(() => this.doSubmit(outputPage), 500);
      return;
    }

    // Finalize and submit form
    const form = document.getElementById(this.config.formId) as HTMLFormElement;
    form.setAttribute('method', 'get');
    form.setAttribute('action', this.config.workerUrl);
    form.setAttribute('target', this.config.workerId);

    this.addHiddenInput(form, 'apicode', this.apiCode);
    this.addHiddenInput(form, 'outputpage', this.outputPageCalc);
    this.addHiddenInput(form, 'timestamp', this.timestamp.toString());

    // Launch worker window
    window.name = this.config.callerId;
    this.launchWorker();
    form.submit();

    // Calculate OFP ID
    const orig = (form.elements.namedItem('orig') as HTMLInputElement).value;
    const dest = (form.elements.namedItem('dest') as HTMLInputElement).value;
    const type = (form.elements.namedItem('type') as HTMLInputElement).value;
    this.ofpId = `${this.timestamp}_${this.md5(orig + dest + type)}`;

    // Start monitoring worker
    this.loopInterval = window.setInterval(() => this.checkWorker(), 500);
  }

  /**
   * Launch popup worker window
   */
  private launchWorker(): void {
    this.worker = window.open('about:blank', this.config.workerId, this.config.workerStyle);

    if (!this.worker) {
      alert('Please disable your pop-up blocker to generate a flight plan!');
    } else if (window.focus) {
      this.worker.focus();
    }
  }

  /**
   * Check if worker window is closed
   */
  private checkWorker(): void {
    if (this.worker && this.worker.closed) {
      if (this.loopInterval !== null) {
        window.clearInterval(this.loopInterval);
      }
      this.redirectCaller();
    }
  }

  /**
   * Redirect to output page with OFP ID
   */
  private redirectCaller(): void {
    if (!this.feResult || this.feResult === 'notset') {
      if (!this.feResult) {
        this.feResult = 'notset';
        this.loadFileCheck(
          `${this.config.apiDir}api/simbrief/check?js_url_check=${this.ofpId}&var=fe_result`
        );
      }
      setTimeout(() => this.redirectCaller(), 500);
      return;
    }

    if (this.feResult === 'true' && this.outputPageSave) {
      const form = document.createElement('form');
      form.setAttribute('method', 'get');
      form.setAttribute('action', this.outputPageSave);

      // Parse existing URL parameters
      const urlInfo = this.parseUrl(this.outputPageSave);
      for (const key in urlInfo.parameters) {
        this.addHiddenInput(form, key, String(urlInfo.parameters[key]));
      }

      this.addHiddenInput(form, 'ofp_id', this.ofpId!);
      document.body.appendChild(form);
      form.submit();
    }
  }

  /**
   * Add hidden input to form
   */
  private addHiddenInput(form: HTMLFormElement, name: string, value: string): void {
    const input = document.createElement('input');
    input.setAttribute('type', 'hidden');
    input.setAttribute('name', name);
    input.setAttribute('value', value);
    form.appendChild(input);
  }

  /**
   * Load API code via script tag
   */
  private loadApiCode(url: string): void {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `${url}&p=${Math.floor(Math.random() * 10000000)}`;
    script.onload = () => {
      // API code will be set via global variable
      const apiCode = (window as any).api_code;
      if (apiCode) {
        this.apiCode = apiCode;
      }
    };
    document.head.appendChild(script);
  }

  /**
   * Load file existence check via script tag
   */
  private loadFileCheck(url: string): void {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `${url}&p=${Math.floor(Math.random() * 10000000)}`;
    script.onload = () => {
      // Result will be set via global variable
      const result = (window as any).fe_result;
      if (result) {
        this.feResult = result;
      }
    };
    document.head.appendChild(script);
  }

  /**
   * Parse URL into components
   */
  private parseUrl(url: string): UrlObject {
    const a = document.createElement('a');
    a.href = url;

    const params: Record<string, string | number | string[]> = {};
    const queryString = a.search.substring(1);
    const pairs = queryString.split('&');

    if (pairs[0].length > 1) {
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        const decodedKey = decodeURI(key);
        let decodedValue: string | number = decodeURI(value);

        // Convert to number if applicable
        if (/^\d+$/.test(decodedValue)) {
          decodedValue = parseInt(decodedValue, 10);
        } else if (/^\d+\.\d+$/.test(decodedValue)) {
          decodedValue = parseFloat(decodedValue);
        }

        if (params[decodedKey] === undefined) {
          params[decodedKey] = decodedValue;
        } else if (typeof params[decodedKey] === 'string' || typeof params[decodedKey] === 'number') {
          params[decodedKey] = [params[decodedKey] as string | number, decodedValue];
        } else {
          (params[decodedKey] as (string | number)[]).push(decodedValue);
        }
      }
    }

    return {
      protocol: a.protocol,
      hostname: a.hostname,
      host: a.host,
      port: a.port,
      hash: a.hash.substr(1),
      pathname: a.pathname,
      search: a.search,
      parameters: params
    };
  }

  /**
   * MD5 hash function (truncated to 10 chars)
   */
  private md5(str: string): string {
    const utf8Encode = (s: string): string => {
      if (s === null || s === undefined) return '';
      
      let encoded = '';
      let start = 0;
      let end = 0;
      
      for (let n = 0; n < s.length; n++) {
        const c1 = s.charCodeAt(n);
        let enc: string | null = null;

        if (c1 < 128) {
          end++;
        } else if (c1 > 127 && c1 < 2048) {
          enc = String.fromCharCode((c1 >> 6) | 192, (c1 & 63) | 128);
        } else if ((c1 & 0xF800) !== 0xD800) {
          enc = String.fromCharCode(
            (c1 >> 12) | 224,
            ((c1 >> 6) & 63) | 128,
            (c1 & 63) | 128
          );
        } else {
          if ((c1 & 0xFC00) !== 0xD800) {
            throw new RangeError(`Unmatched trail surrogate at ${n}`);
          }
          const c2 = s.charCodeAt(++n);
          if ((c2 & 0xFC00) !== 0xDC00) {
            throw new RangeError(`Unmatched lead surrogate at ${n - 1}`);
          }
          const combined = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000;
          enc = String.fromCharCode(
            (combined >> 18) | 240,
            ((combined >> 12) & 63) | 128,
            ((combined >> 6) & 63) | 128,
            (combined & 63) | 128
          );
        }

        if (enc !== null) {
          if (end > start) {
            encoded += s.slice(start, end);
          }
          encoded += enc;
          start = end = n + 1;
        }
      }

      if (end > start) {
        encoded += s.slice(start, s.length);
      }

      return encoded;
    };

    const rotateLeft = (val: number, shift: number): number =>
      (val << shift) | (val >>> (32 - shift));

    const addUnsigned = (x: number, y: number): number => {
      const x8 = x & 0x80000000;
      const y8 = y & 0x80000000;
      const x4 = x & 0x40000000;
      const y4 = y & 0x40000000;
      const result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);

      if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
      if (x4 | y4) {
        return result & 0x40000000
          ? result ^ 0xC0000000 ^ x8 ^ y8
          : result ^ 0x40000000 ^ x8 ^ y8;
      }
      return result ^ x8 ^ y8;
    };

    const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
    const G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
    const H = (x: number, y: number, z: number) => x ^ y ^ z;
    const I = (x: number, y: number, z: number) => y ^ (x | ~z);

    const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
      a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
      a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
      a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
      a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    };

    const convertToWordArray = (s: string): number[] => {
      const msgLen = s.length;
      const numWordsTemp1 = msgLen + 8;
      const numWordsTemp2 = (numWordsTemp1 - (numWordsTemp1 % 64)) / 64;
      const numWords = (numWordsTemp2 + 1) * 16;
      const wordArray = new Array(numWords - 1).fill(0);

      let bytePos = 0;
      let byteCount = 0;

      while (byteCount < msgLen) {
        const wordCount = (byteCount - (byteCount % 4)) / 4;
        bytePos = (byteCount % 4) * 8;
        wordArray[wordCount] = wordArray[wordCount] | (s.charCodeAt(byteCount) << bytePos);
        byteCount++;
      }

      const wordCount = (byteCount - (byteCount % 4)) / 4;
      bytePos = (byteCount % 4) * 8;
      wordArray[wordCount] = wordArray[wordCount] | (0x80 << bytePos);
      wordArray[numWords - 2] = msgLen << 3;
      wordArray[numWords - 1] = msgLen >>> 29;

      return wordArray;
    };

    const wordToHex = (val: number): string => {
      let result = '';
      for (let i = 0; i <= 3; i++) {
        const byte = (val >>> (i * 8)) & 255;
        const hexByte = ('0' + byte.toString(16)).slice(-2);
        result += hexByte;
      }
      return result;
    };

    const encoded = utf8Encode(str);
    const x = convertToWordArray(encoded);

    let a = 0x67452301;
    let b = 0xEFCDAB89;
    let c = 0x98BADCFE;
    let d = 0x10325476;

    for (let k = 0; k < x.length; k += 16) {
      const AA = a, BB = b, CC = c, DD = d;

      a = FF(a, b, c, d, x[k + 0], 7, 0xD76AA478);
      d = FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756);
      c = FF(c, d, a, b, x[k + 2], 17, 0x242070DB);
      b = FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE);
      a = FF(a, b, c, d, x[k + 4], 7, 0xF57C0FAF);
      d = FF(d, a, b, c, x[k + 5], 12, 0x4787C62A);
      c = FF(c, d, a, b, x[k + 6], 17, 0xA8304613);
      b = FF(b, c, d, a, x[k + 7], 22, 0xFD469501);
      a = FF(a, b, c, d, x[k + 8], 7, 0x698098D8);
      d = FF(d, a, b, c, x[k + 9], 12, 0x8B44F7AF);
      c = FF(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1);
      b = FF(b, c, d, a, x[k + 11], 22, 0x895CD7BE);
      a = FF(a, b, c, d, x[k + 12], 7, 0x6B901122);
      d = FF(d, a, b, c, x[k + 13], 12, 0xFD987193);
      c = FF(c, d, a, b, x[k + 14], 17, 0xA679438E);
      b = FF(b, c, d, a, x[k + 15], 22, 0x49B40821);
      a = GG(a, b, c, d, x[k + 1], 5, 0xF61E2562);
      d = GG(d, a, b, c, x[k + 6], 9, 0xC040B340);
      c = GG(c, d, a, b, x[k + 11], 14, 0x265E5A51);
      b = GG(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA);
      a = GG(a, b, c, d, x[k + 5], 5, 0xD62F105D);
      d = GG(d, a, b, c, x[k + 10], 9, 0x2441453);
      c = GG(c, d, a, b, x[k + 15], 14, 0xD8A1E681);
      b = GG(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8);
      a = GG(a, b, c, d, x[k + 9], 5, 0x21E1CDE6);
      d = GG(d, a, b, c, x[k + 14], 9, 0xC33707D6);
      c = GG(c, d, a, b, x[k + 3], 14, 0xF4D50D87);
      b = GG(b, c, d, a, x[k + 8], 20, 0x455A14ED);
      a = GG(a, b, c, d, x[k + 13], 5, 0xA9E3E905);
      d = GG(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8);
      c = GG(c, d, a, b, x[k + 7], 14, 0x676F02D9);
      b = GG(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A);
      a = HH(a, b, c, d, x[k + 5], 4, 0xFFFA3942);
      d = HH(d, a, b, c, x[k + 8], 11, 0x8771F681);
      c = HH(c, d, a, b, x[k + 11], 16, 0x6D9D6122);
      b = HH(b, c, d, a, x[k + 14], 23, 0xFDE5380C);
      a = HH(a, b, c, d, x[k + 1], 4, 0xA4BEEA44);
      d = HH(d, a, b, c, x[k + 4], 11, 0x4BDECFA9);
      c = HH(c, d, a, b, x[k + 7], 16, 0xF6BB4B60);
      b = HH(b, c, d, a, x[k + 10], 23, 0xBEBFBC70);
      a = HH(a, b, c, d, x[k + 13], 4, 0x289B7EC6);
      d = HH(d, a, b, c, x[k + 0], 11, 0xEAA127FA);
      c = HH(c, d, a, b, x[k + 3], 16, 0xD4EF3085);
      b = HH(b, c, d, a, x[k + 6], 23, 0x4881D05);
      a = HH(a, b, c, d, x[k + 9], 4, 0xD9D4D039);
      d = HH(d, a, b, c, x[k + 12], 11, 0xE6DB99E5);
      c = HH(c, d, a, b, x[k + 15], 16, 0x1FA27CF8);
      b = HH(b, c, d, a, x[k + 2], 23, 0xC4AC5665);
      a = II(a, b, c, d, x[k + 0], 6, 0xF4292244);
      d = II(d, a, b, c, x[k + 7], 10, 0x432AFF97);
      c = II(c, d, a, b, x[k + 14], 15, 0xAB9423A7);
      b = II(b, c, d, a, x[k + 5], 21, 0xFC93A039);
      a = II(a, b, c, d, x[k + 12], 6, 0x655B59C3);
      d = II(d, a, b, c, x[k + 3], 10, 0x8F0CCC92);
      c = II(c, d, a, b, x[k + 10], 15, 0xFFEFF47D);
      b = II(b, c, d, a, x[k + 1], 21, 0x85845DD1);
      a = II(a, b, c, d, x[k + 8], 6, 0x6FA87E4F);
      d = II(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0);
      c = II(c, d, a, b, x[k + 6], 15, 0xA3014314);
      b = II(b, c, d, a, x[k + 13], 21, 0x4E0811A1);
      a = II(a, b, c, d, x[k + 4], 6, 0xF7537E82);
      d = II(d, a, b, c, x[k + 11], 10, 0xBD3AF235);
      c = II(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB);
      b = II(b, c, d, a, x[k + 9], 21, 0xEB86D391);

      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }

    const hash = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
    return hash.toUpperCase().substr(0, 10);
  }
}

// Export for use in other modules
export default SimBriefAPI;
