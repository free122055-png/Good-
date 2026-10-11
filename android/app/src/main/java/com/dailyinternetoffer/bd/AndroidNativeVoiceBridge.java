package com.dailyinternetoffer.bd;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import android.webkit.JavascriptInterface;
import java.util.Locale;

/**
 * Production-ready Android Native Text-To-Speech Bridge for Al MAYADIN FASHION.
 * Works 100% offline, requires no external internet connection for pre-installed TTS,
 * handles Release/Debug builds, and prevents any application crash if TTS is unavailable.
 */
public class AndroidNativeVoiceBridge {
    private static final String TAG = "AlMayadinNativeVoice";
    private TextToSpeech textToSpeech;
    private boolean isReady = false;
    private final Context context;

    public AndroidNativeVoiceBridge(Context context) {
        this.context = context.getApplicationContext();
        initTts();
    }

    private synchronized void initTts() {
        try {
            if (textToSpeech != null) {
                return;
            }
            textToSpeech = new TextToSpeech(context, new TextToSpeech.OnInitListener() {
                @Override
                public void onInit(int status) {
                    if (status == TextToSpeech.SUCCESS) {
                        try {
                            // Attempt to set Bengali language (Bangladesh / India / Generic)
                            Locale bnLocale = new Locale("bn", "BD");
                            int result = textToSpeech.setLanguage(bnLocale);
                            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                                bnLocale = new Locale("bn", "IN");
                                result = textToSpeech.setLanguage(bnLocale);
                            }
                            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                                bnLocale = new Locale("bn");
                                textToSpeech.setLanguage(bnLocale);
                            }

                            textToSpeech.setSpeechRate(0.95f);
                            textToSpeech.setPitch(1.0f);
                            isReady = true;
                            Log.d(TAG, "Native Bengali TextToSpeech initialized successfully");
                        } catch (Exception ex) {
                            Log.w(TAG, "Notice setting TTS language: " + ex.getMessage());
                            isReady = true;
                        }
                    } else {
                        Log.w(TAG, "Native TTS init failed with status: " + status);
                        isReady = false;
                    }
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error instantiating Native TextToSpeech: " + e.getMessage());
            isReady = false;
        }
    }

    @JavascriptInterface
    public boolean isAvailable() {
        return isReady && textToSpeech != null;
    }

    @JavascriptInterface
    public void speak(String text) {
        if (text == null || text.trim().isEmpty()) {
            return;
        }
        try {
            if (textToSpeech == null) {
                initTts();
            }
            if (textToSpeech != null) {
                String utteranceId = "voice_" + System.currentTimeMillis();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    Bundle params = new Bundle();
                    params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId);
                    textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId);
                } else {
                    textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error during native TTS speech playback: " + e.getMessage());
        }
    }

    @JavascriptInterface
    public void stop() {
        try {
            if (textToSpeech != null) {
                textToSpeech.stop();
            }
        } catch (Exception e) {
            Log.w(TAG, "Error stopping native TTS: " + e.getMessage());
        }
    }

    public void destroy() {
        try {
            if (textToSpeech != null) {
                textToSpeech.stop();
                textToSpeech.shutdown();
                textToSpeech = null;
                isReady = false;
            }
        } catch (Exception e) {
            Log.w(TAG, "Error cleaning up TTS: " + e.getMessage());
        }
    }
}
