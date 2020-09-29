#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
@author: nl8590687
用于测试整个一套语音识别系统的程序
语音模型 + 语言模型
"""
import platform as plat

from .SpeechModel251 import ModelSpeech
from keras import backend as K
import tensorflow as tf

import librosa
import soundfile as sf


__all__ = ['ASR_TMP']



class ASR_TMP():
    def __init__(self):
        modelpath = 'ASR_TMP/model_speech/'
        datapath = 'ASR_TMP'
        self.graph = tf.get_default_graph()
        self.session = tf.Session()
        with self.graph.as_default():
            with self.session.as_default():
                ms = ModelSpeech(datapath)
                ms.LoadModel(modelpath + 'speech_model251_e_0_step_625000.model')
                self.model = ms


    def get_asr_ver_tmp(self, wav_dir, preset_pingyin=['yi', 'san', 'si', 'liu', 'qi', 'si', 'er', 'san', 'si', 'ba']):

        wavsignal, sr = librosa.load(wav_dir, sr=16000)
        sf.write('ASR_TMP/testing_asr.wav', wavsignal, sr)
        with self.graph.as_default():
            with self.session.as_default():
                r = self.model.RecognizeSpeech_FromFile('ASR_TMP/testing_asr.wav')


        r_f = [ i[:-1] for i in r]
        print(r_f)

        confi = 0
        r_f_tmp = r_f[:]
        # for i in preset_pingyin:
        #     for count, j in enumerate(r_f_tmp):
        #         if i == j:
        #             confi += 1
        #             r_f_tmp = r_f_tmp[count:]

        # for i in preset_pingyin:
        #     if i in r_f_tmp:
        #         confi += 1

        for t_count, target in enumerate(preset_pingyin):
            print(r_f_tmp)
            for s_count, source in enumerate(r_f_tmp):
                if target == source:
                    confi += 0.5
                    try:
                        if preset_pingyin[t_count+1] == r_f_tmp[s_count+1]:
                            confi += 1
                            
                            try:
                                if preset_pingyin[t_count+2] == r_f_tmp[s_count+2]:
                                    confi += 1.5    
                            except IndexError:
                                pass

                    except IndexError:
                        pass

                    r_f_tmp.pop(s_count)
                    break

        return confi



















