import { WizardContext } from '@/lib/endorse-gen-types';

async function testApi(endpoint: string, body: any) {
    const baseUrl = 'http://localhost:3000/api/endorse-gen';
    console.log(`Testing ${endpoint}...`);
    try {
        const res = await fetch(`${baseUrl}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        console.log(`Response from ${endpoint}:`, JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error(`Error testing ${endpoint}:`, error);
    }
}

async function runTests() {
    const context: WizardContext = {
        industry: 'Renovation',
        trustTier: 'RENO_TRADES',
        ROI: 'High',
        surveyFreeText: 'They did a great job on our roof. It looks amazing and they were very professional.',
        toneProfile: 'Professional',
        friendName: 'John',
    };

    // 1. Action Ranking
    await testApi('action-ranking', context);

    // 2. Personalization
    await testApi('personalization', { friendName: 'Dr. Smith' });

    // 3. Template Selector
    await testApi('template-selector', { ...context, chosenActionType: 'BEFORE_AFTER_IMAGES' });

    // 4. Script Generator
    const scriptRes = await testApi('script-generator', { ...context, chosenActionType: 'BEFORE_AFTER_IMAGES' });

    // 5. Script Review
    if (scriptRes?.script) {
        await testApi('script-review', { script: scriptRes.script, context });
    }

    // 6. Asset Request
    await testApi('asset-request', { ...context, chosenActionType: 'BEFORE_AFTER_IMAGES' });

    // 7. Consent
    await testApi('consent', {});

    // 8. Delivery
    await testApi('delivery', { ...context, chosenActionType: 'BEFORE_AFTER_IMAGES' });

    // 9. Completion
    await testApi('completion', context);

    // 10. Review Assist
    await testApi('review-assist', { surveyFreeText: context.surveyFreeText, context });
}

runTests();
