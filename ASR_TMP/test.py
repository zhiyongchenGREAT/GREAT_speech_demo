#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
@author: nl8590687
用于测试整个一套语音识别系统的程序
语音模型 + 语言模型
"""
import platform as plat

from SpeechModel251 import ModelSpeech
from keras import backend as K

import librosa
import soundfile as sf


modelpath = 'model_speech/'
datapath = '.'

ms = ModelSpeech(datapath)
ms.LoadModel(modelpath + 'speech_model251_e_0_step_625000.model')



utt_dir = '/home/bicbrv/project/GREAT_audio_demo_server_new/formal_data/enrollment/#0008_智勇/智勇_0.wav'

wavsignal, sr = librosa.load(utt_dir, sr=16000)
sf.write('testing_asr.wav', wavsignal, sr)
r = ms.RecognizeSpeech_FromFile('testing_asr.wav')

#K.clear_session()
print('*[提示] 语音识别结果：\n',r)



















