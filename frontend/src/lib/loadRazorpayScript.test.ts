import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadRazorpayScript, resetRazorpayScriptLoaderForTests } from './loadRazorpayScript';

describe('loadRazorpayScript', () => {
  beforeEach(() => {
    resetRazorpayScriptLoaderForTests();
    delete window.Razorpay;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    resetRazorpayScriptLoaderForTests();
    delete window.Razorpay;
    document.body.innerHTML = '';
  });

  it('resolves immediately when Razorpay is already on window', async () => {
    window.Razorpay = class RazorpayMock {} as never;

    await expect(loadRazorpayScript()).resolves.toBeUndefined();
    expect(document.getElementById('razorpay-checkout-js')).toBeNull();
  });

  it('resolves when existing script element fires load', async () => {
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    document.body.appendChild(script);

    const promise = loadRazorpayScript();
    script.dispatchEvent(new Event('load'));

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects when existing script element fires error', async () => {
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    document.body.appendChild(script);

    const promise = loadRazorpayScript();
    script.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow('Failed to load Razorpay checkout script');
  });

  it('creates script element and resolves on load', async () => {
    const promise = loadRazorpayScript();
    const script = document.getElementById('razorpay-checkout-js') as HTMLScriptElement;

    expect(script).not.toBeNull();
    expect(script.src).toBe('https://checkout.razorpay.com/v1/checkout.js');
    expect(script.async).toBe(true);

    script.onload?.(new Event('load') as Event);

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects when newly created script fails to load', async () => {
    const promise = loadRazorpayScript();
    const script = document.getElementById('razorpay-checkout-js') as HTMLScriptElement;

    script.onerror?.(new Event('error') as Event);

    await expect(promise).rejects.toThrow('Failed to load Razorpay checkout script');
  });

  it('reuses in-flight loading promise', async () => {
    const first = loadRazorpayScript();
    const second = loadRazorpayScript();

    expect(second).toBe(first);

    const script = document.getElementById('razorpay-checkout-js') as HTMLScriptElement;
    script.onload?.(new Event('load') as Event);

    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  });

  it('resetRazorpayScriptLoaderForTests allows a fresh load cycle', async () => {
    const first = loadRazorpayScript();
    const firstScript = document.getElementById('razorpay-checkout-js') as HTMLScriptElement;
    firstScript.onload?.(new Event('load') as Event);
    await first;

    resetRazorpayScriptLoaderForTests();
    document.body.innerHTML = '';

    const second = loadRazorpayScript();
    expect(document.getElementById('razorpay-checkout-js')).not.toBeNull();

    const secondScript = document.getElementById('razorpay-checkout-js') as HTMLScriptElement;
    secondScript.onload?.(new Event('load') as Event);

    await expect(second).resolves.toBeUndefined();
  });
});