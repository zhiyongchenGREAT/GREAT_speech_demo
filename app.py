#!/usr/bin/env python3
import os
import glob
import subprocess
import collections
import shutil
import pickle

from flask import Flask, render_template, request, json, redirect, url_for, send_file
from flask_socketio import SocketIO, emit, join_room, leave_room, \
    close_room, rooms, disconnect

import numpy as np

from utt_process import OneUtterance
import ASR_TMP
# from SR_3D.interface_production import SR_3D
# from tacotron.eval import tacotron_main
# from tacotron.synthesizer import Synthesizer
# from tacotron.hparams import hparams, hparams_debug_string
# from kaldi.kaldi_sv import KaldiSv, kaldi_audio_preprocessing
# from GMM import SR_GMM
# from threading import Lock


async_mode = None
app = Flask(__name__)
socketio = SocketIO(app, async_mode=async_mode)


# def update_attenders():
#     global embedding_dict
#     root_path = './audiodata/dataset'
#     attenders = os.listdir(root_path)
#     print(attenders)

#     for i in attenders:
#         wav_file = os.path.join(root_path,i)
#         spk_embedding = helper.get_embedding(wav_file)
#         spk_embedding = (1.0 / np.linalg.norm(spk_embedding)) * spk_embedding
#         embedding_dict[i] = spk_embedding

def get_attenders_emb_dict(enroll_list_dir, enroll_list, out_emb_dict_dir):
    embedding_dict = {}
    print(enroll_list_dir)
    for count, enroll_dir in enumerate(enroll_list_dir):
        enroll_wav_list = glob.glob(os.path.join(enroll_dir, '*'))
        enroll_id = enroll_list[count]

        for wav_file in enroll_wav_list:
            spk_embedding = helper.get_embedding(wav_file)
            if enroll_id not in embedding_dict.keys():
                embedding_dict[enroll_id] = spk_embedding[None, :]
            else:
                embedding_dict[enroll_id] = np.append(embedding_dict[enroll_id], spk_embedding[None, :], axis=0)

        embedding_dict[enroll_id] = np.mean(embedding_dict[enroll_id], axis=0).squeeze()
        embedding_dict[enroll_id] = (1.0 / np.linalg.norm(embedding_dict[enroll_id])) * embedding_dict[enroll_id]

    with open(out_emb_dict_dir, 'wb') as handle:
        pickle.dump(embedding_dict, handle)
    
    # with open(spk2utt_dict, 'rb') as handle:
    #     spk2utt = pickle.load(handle)


def compare_embedding(embedding, embedding_dict):
    embedding = (1.0 / np.linalg.norm(embedding)) * embedding
    distance = -5
    speaker=None
    for key in embedding_dict:
        now_distance = np.dot(embedding.squeeze(), np.array(embedding_dict[key]).squeeze())
        if now_distance>distance:
            distance = now_distance
            speaker=key
        print(now_distance, key)
    return speaker

def compare_verification_embedding(embedding, embedding_dict_dir):
    embedding = (1.0 / np.linalg.norm(embedding)) * embedding

    with open(embedding_dict_dir, 'rb') as handle:
        embedding_dict = pickle.load(handle)
    
    distance_dict={}


    for key in embedding_dict:
        distance_dict[key] = np.dot(embedding.squeeze(), np.array(embedding_dict[key]).squeeze())

        print(key, distance_dict[key])

    return distance_dict

def dir_init():
    datapath = os.path.join(app.root_path, 'formal_data', 'enrollment')
    if not os.path.exists(datapath):
        os.makedirs(datapath)
    datapath = os.path.join(app.root_path, 'formal_data', 'testing')
    if not os.path.exists(datapath):
        os.makedirs(datapath)
    datapath = os.path.join(app.root_path, 'formal_data', 'id_testing')
    if not os.path.exists(datapath):
        os.makedirs(datapath)

asr_model = ASR_TMP.ASR_TMP()
helper = OneUtterance()
dir_init()

@app.route('/')
def init_recorder():
    dirs = glob.glob(os.path.join(app.root_path, 'formal_data', 'enrollment/*'))
    data = {}
    for directory in dirs:
        label = os.path.basename(directory.rstrip('/'))
        data[label.split('_')[0]] = {}
        data[label.split('_')[0]]['user_name'] = label.split('_')[-1]
        data[label.split('_')[0]]['quantity'] = len(os.listdir(directory))
        pass

    new_id, new_user = "#{:04d}".format(
        len(data) + 1), "user{:d}".format(len(data) + 1)
    return render_template('verification.html', data=data, new_id=new_id, new_user=new_user)


@app.route('/identification')
def identification():

    dirs = glob.glob(os.path.join(
        app.root_path, 'formal_data', 'enrollment/*'))
    data = {}
    for directory in dirs:
        label = os.path.basename(directory.rstrip('/'))
        data[label.split('_')[0]] = {}
        data[label.split('_')[0]]['user_name'] = label.split('_')[-1]
        data[label.split('_')[0]]['quantity'] = len(os.listdir(directory))
        pass
    new_id, new_user = "#{:04d}".format(
        len(data) + 1), "user{:d}".format(len(data) + 1)
    return render_template('identification.html', data=data, new_id=new_id, new_user=new_user)


@app.route('/tacotron')
def tacotron():
    return render_template('tacotron.html')


@app.route('/uploads', methods=['POST'])
def save_audio():
    stage = request.form['stage']
    user_name = request.form['user_name']
    user_id = request.form['user_id']
    audio = request.files['audio']
    datapath = os.path.join(app.root_path, 'formal_data',
                            stage, user_id + '_' + user_name)
    if not os.path.exists(datapath):
        os.makedirs(datapath)
        item_num = 0
    else:
        item_num = len([name for name in os.listdir(datapath)])

    audio.save(os.path.join(datapath, user_name + '_' + str(item_num) + '.wav'))

    return json.jsonify({'data': 'all_good'})


@app.route('/enroll', methods=['POST'])
def enroll():
    dirs = glob.glob(os.path.join(app.root_path, 'formal_data', 'enrollment/*'))
    data = {}
    for directory in dirs:
        label = os.path.basename(directory.rstrip('/'))
        data[label.split('_')[0]] = {}
        data[label.split('_')[0]]['user_name'] = label.split('_')[-1]
        data[label.split('_')[0]]['quantity'] = len(os.listdir(directory))
        pass

    enroll_users = request.get_json(force=True)['data']
    enroll_list_dir = [os.path.join(app.root_path, 'formal_data', 'enrollment', x + '_' + data[x]['user_name']) for x in
                    enroll_users]

    enroll_list = [x + '_' + data[x]['user_name'] for x in enroll_users]

    # input_dirs = " ".join(input_list)
    out_emb_dict_dir = os.path.join(app.root_path, 'formal_data', 'testing', 'enroll_emb_dict')
    get_attenders_emb_dict(enroll_list_dir, enroll_list, out_emb_dict_dir)

    result = 'all_good'
    if result == 'all_good':
        return json.jsonify({'data': 'all_good'})
    else:
        return json.jsonify({'data': 'bad'})
    return json.jsonify({'data': 'all_good'})


@app.route('/verify', methods=['POST'])
def verify():
    audio = request.files['audio']
    datapath = os.path.join(app.root_path, 'formal_data', 'testing')

    if not os.path.exists(datapath):
        os.makedirs(datapath)

    audio.save(os.path.join(datapath, 'testing.wav'))

    embedding_dict_dir = os.path.join(app.root_path, 'formal_data', 'testing', 'enroll_emb_dict')
    embedding = helper.get_embedding(os.path.join(datapath, 'testing.wav'))

    distance_dict = compare_verification_embedding(embedding, embedding_dict_dir)
    print(distance_dict)
    
    TH = 0.4
    result = 'Not Match'
    for i in distance_dict:
        if distance_dict[i] > TH:
            result = 'Match'
        distance_dict[i] = str(distance_dict[i])
    distance_dict['data'] = result

    result_asr = asr_model.get_asr_ver_tmp(wav_dir=os.path.join(datapath, 'testing.wav'))
    print(result_asr)

    TH_ASR = 7
    distance_dict['data_asr_confi'] = str(result_asr)
    if result_asr > TH_ASR:
        distance_dict['data_asr'] = 'Match'
    else:
        distance_dict['data_asr'] = 'Not Match'
        
    return json.jsonify(distance_dict)
    # if result:
    #     return json.jsonify({'data': 'True'})
    # else:
    #     return json.jsonify({'data': 'False'})

@app.route('/taco_generate', methods=['POST'])
def taco_generate():
    text = request.get_json(force=True)['data']
    print('Synthesizing...')
    raw_audio = None
    return raw_audio


@socketio.on('my_event', namespace='/test')
def test_message(message):
    emit('my_response',
         {'data': message['data']})


@socketio.on('identify', namespace='/test')
def save_wav(wav):

    wav_dir = os.path.join(app.root_path, 'formal_data', 'id_testing', 'testing.wav')
    with open(wav_dir, 'wb') as f:
        f.write(wav['data'])

    embedding_dict_dir = os.path.join(app.root_path, 'formal_data', 'testing', 'enroll_emb_dict')
    embedding = helper.get_embedding(wav_dir)

    distance_dict = compare_verification_embedding(embedding, embedding_dict_dir)
    print(distance_dict)

    TH = 0.1
    # result = 'False'
    now_largest = -1.0
    result = 'Not Detected'
    for i in distance_dict:
        if distance_dict[i] > now_largest:
            now_largest = distance_dict[i]
            result = i
    if now_largest < TH:
        result = 'Not Detected'

    # emit('identify_my_response', {'data': result})
    emit('identify_my_response', {'data': result.split('_')[0]})


@socketio.on('disconnect_request', namespace='/test')
def disconnect_request():
    emit('my_response',
         {'data': 'Disconnected!'})
    disconnect()


@socketio.on('connect', namespace='/test')
def test_connect():
    emit('my_response', {'data': 'Server connect OK!'})


@socketio.on('disconnect', namespace='/test')
def test_disconnect():
    print('Client disconnected', request.sid)

if __name__ == '__main__':
    # print('OK')
    # helper = OneUtterance()
    # dir_init()
    
    socketio.run(app)


#     # app.run()