import librosa
import matplotlib.pyplot as plt
import librosa.display
import numpy as np
import torch
import os
import glob
import pickle
import copy
import random
import time
import traceback
from model_backbone import Xvector_SAP_1L
import collections

class OneUtterance(object):
    def __init__(self):
        self.sr = 16000
        #self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.device = 'cpu'
        self.model_path = './target.model'
        self.model = Xvector_SAP_1L(feat_dim=30, emb_dim=512)
        checkpoint = torch.load(self.model_path, map_location='cpu')
        new_state_dict = collections.OrderedDict()
        for k in list(checkpoint['model'].keys()):
            if k[0]=='b':
                name = k[16:]
                new_state_dict[name] = checkpoint['model'][k]
        self.model.load_state_dict(new_state_dict, strict=True)
        self.model = self.model.to(self.device)
        self.model.eval()
        print('model_init_success')
    
    def preprocess_one_utt(self, utt_dir):
        try:
            print(utt_dir)
            concat_wav, _ = librosa.load(utt_dir, sr=self.sr)
            
            VAD_result = self._VAD_detection(concat_wav)
            
            aug_wav = concat_wav

            single_feats = librosa.feature.mfcc(y=aug_wav, sr=self.sr, n_mfcc=30, \
            dct_type=2, n_fft=512, hop_length=160, \
            win_length=None, window='hann', power=2.0, \
            center=True, pad_mode='reflect', n_mels=30, \
            fmin=20, fmax=7600)
            # Note single_feats needs transpose
            out_feats = self._CMVN(single_feats.T, cmn_window = 300, normalize_variance = False)
            # Apply VAD
            assert out_feats.shape[0] == VAD_result.shape[0]
            out_feats = out_feats[VAD_result.astype(np.bool)]
            
            batched_feats = out_feats[None, :, :]
            # print(batched_feats)
                
            return batched_feats
        
        except Exception:
            traceback.print_exc()

    @property
    def _VAD_config(self):
        vad_energy_threshold = -3.0
        vad_energy_mean_scale = 1.0
        vad_frames_context = 0
        vad_proportion_threshold = 0.12
        
        return vad_energy_threshold, vad_energy_mean_scale,\
        vad_frames_context, vad_proportion_threshold
        
        
    def _VAD_detection(self, wav):
        vad_energy_threshold, vad_energy_mean_scale,\
        vad_frames_context, vad_proportion_threshold = self._VAD_config
        
        y_tmp = np.pad(wav, int(512 // 2), mode='reflect')
        y_tmp = librosa.util.frame(y_tmp, frame_length=512, hop_length=160)
        y_log_energy = np.log(np.maximum(np.sum(y_tmp**2, axis=0), 1e-15))

        T = len(y_log_energy)
        output_voiced = np.zeros(T)
        if (T == 0):
            raise Exception("zero wave length")

        energy_threshold = vad_energy_threshold
        if (vad_energy_mean_scale != 0.0):
            assert(vad_energy_mean_scale > 0.0)
            energy_threshold += vad_energy_mean_scale * np.sum(y_log_energy) / T

        assert(vad_frames_context >= 0)
        assert(vad_proportion_threshold > 0.0 and vad_proportion_threshold < 1.0);

        for t in range(T):
            num_count = 0
            den_count = 0
            context = vad_frames_context
            for t2 in range(t - context, t + context+1):
                if (t2 >= 0 and t2 < T):
                    den_count+=1
                    if (y_log_energy[t2] > energy_threshold):
                        num_count+=1

            if (num_count >= den_count * vad_proportion_threshold):
                output_voiced[t] = 1.0
            else:
                output_voiced[t] = 0.0
        
        return output_voiced

    def _CMVN(self, in_feat, cmn_window = 300, normalize_variance = False):             
        num_frames = in_feat.shape[0]
        dim = in_feat.shape[1]
        last_window_start = -1
        last_window_end = -1
        cur_sum = np.zeros(dim)
        cur_sumsq = np.zeros(dim)

        out_feat = np.zeros([num_frames, dim])

        for t in range(num_frames):
            window_start = 0
            window_end = 0

            window_start = t - int(cmn_window / 2)
            window_end = window_start + cmn_window

            if (window_start < 0):
                window_end -= window_start
                window_start = 0

            if (window_end > num_frames):
                window_start -= (window_end - num_frames)
                window_end = num_frames
                if (window_start < 0):
                    window_start = 0

            if (last_window_start == -1):
                input_part = in_feat[window_start:window_end]
                cur_sum = np.sum(input_part, axis=0, keepdims=False)
                if normalize_variance:
                    cur_sumsq = np.sum(input_part**2, axis=0, keepdims=False)
            else:
                if (window_start > last_window_start):
                    frame_to_remove = in_feat[last_window_start]
                    cur_sum -= frame_to_remove
                    if normalize_variance:
                        cur_sumsq -= frame_to_remove**2

                if (window_end > last_window_end):
                    frame_to_add = in_feat[last_window_end]
                    cur_sum += frame_to_add
                    if normalize_variance:
                        cur_sumsq += frame_to_add**2

            window_frames = window_end - window_start
            last_window_start = window_start
            last_window_end = window_end

            out_feat[t] = in_feat[t] - (1.0 / window_frames) * cur_sum


            if normalize_variance:
                if (window_frames == 1):
                    out_feat[t] = 0.0
                else:
                    variance = (1.0 / window_frames) * cur_sumsq - (1.0 / window_frames**2) * cur_sum**2
                    variance = np.maximum(1.0e-10, variance)
                    out_feat[t] /= variance**(0.5)
                    
        return out_feat
    
        

    def get_embedding(self, utt_dir):
        feats = self.preprocess_one_utt(utt_dir)
        feats = torch.FloatTensor(feats)
        #feats = feats.cuda(non_blocking=True)
        embedding = self.model(feats)
        return embedding.data.cpu().numpy()

    def get_embedding_from_mfcc(self, feats):
        feats = torch.FloatTensor(feats)
        #feats = feats.cuda(non_blocking=True)
        embedding = self.model(feats)
        return embedding.data.cpu().numpy()

    
