// PostHog Analytics — Verifyr
// API key is loaded from /config (never hardcoded in source).
// Captures anonymously by default; opt-out applied when user rejects consent.
!function(t,e){var o,n,p,r;e.__SV||(window.posthog&&window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="fi init Oi Fi ft Ii Ai Ri capture calculateEventProperties Ni register register_once register_for_session unregister unregister_for_session Hi getFeatureFlag getFeatureFlagPayload getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync qi identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty zi Li createPersonProfile setInternalOrTestUser Bi $i Wi opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Mi debug bt ji getPageViewId captureTraceFeedback captureTraceMetric Si".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

(function () {
    fetch('/config')
        .then(function (r) { return r.json(); })
        .then(function (cfg) {
            if (!cfg.posthog_api_key) return;
            posthog.init(cfg.posthog_api_key, {
                api_host: window.location.origin + '/ingest',
                ui_host: 'https://eu.posthog.com',
                defaults: '2026-01-30',
                person_profiles: 'identified_only',
                autocapture_exceptions: true,
            });
            posthog.register({ language: localStorage.getItem('verifyr-lang') || 'de' });
        })
        .catch(function () { /* PostHog unavailable — analytics silently disabled */ });
})();
