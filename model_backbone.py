import torch
import torch.nn as nn
import numpy as np
import math

class Xvector_SAP_1L(torch.nn.Module):
    def __init__(self, feat_dim, emb_dim):
        super(Xvector_SAP_1L, self).__init__()
        self.feature_dim = feat_dim
        self.embedding_dim = emb_dim
        self.in_channels = [self.feature_dim, 512, 512, 512, 512]
        self.layer_sizes = [512, 512, 512, 512, 1500]
        self.kernel_sizes = [5, 3, 3, 1, 1]
        self.dilations = [1,2,3,1,1]
        self.hidden_dim = 3000

        self.tdnn1 = torch.nn.Sequential(
            nn.Conv1d(self.in_channels[0],self.layer_sizes[0],self.kernel_sizes[0],dilation=self.dilations[0]),
            nn.ReLU(True),
            nn.BatchNorm1d(self.layer_sizes[0])
        )
        self.tdnn2 = torch.nn.Sequential(
            nn.Conv1d(self.in_channels[1],self.layer_sizes[1],self.kernel_sizes[1],dilation=self.dilations[1]),
            nn.ReLU(True),
            nn.BatchNorm1d(self.layer_sizes[1])
        )
        self.tdnn3 = torch.nn.Sequential(
            nn.Conv1d(self.in_channels[2],self.layer_sizes[2],self.kernel_sizes[2],dilation=self.dilations[2]),
            nn.ReLU(True),
            nn.BatchNorm1d(self.layer_sizes[2])
        )
        self.tdnn4 = torch.nn.Sequential(
            nn.Conv1d(self.in_channels[3],self.layer_sizes[3],self.kernel_sizes[3],dilation=self.dilations[3]),
            nn.ReLU(True),
            nn.BatchNorm1d(self.layer_sizes[3])
        )
        self.tdnn5 = torch.nn.Sequential(
            nn.Conv1d(self.in_channels[4],self.layer_sizes[4],self.kernel_sizes[4],dilation=self.dilations[4]),
            nn.ReLU(True),
            nn.BatchNorm1d(self.layer_sizes[4])
        )

        self.embedding_layer1 = torch.nn.Sequential()
        self.embedding_layer1.add_module('linear', nn.Linear(self.hidden_dim, self.embedding_dim))
        # self.embedding_layer1.add_module('relu', nn.ReLU(True))
        self.embedding_layer1.add_module('batchnorm',nn.BatchNorm1d(self.embedding_dim))

    def stat_pool(self, stat_src):
        stat_mean = torch.mean(stat_src,dim=2)
        stat_std = torch.sqrt(torch.var(stat_src,dim=2)+0.00001)
        stat_pool_out = torch.cat((stat_mean,stat_std),1)
        return stat_pool_out

    def forward(self, x):
        src = x.permute(0,2,1)
        out = self.tdnn1(src)
        out = self.tdnn2(out)
        out = self.tdnn3(out)
        out = self.tdnn4(out)
        out = self.tdnn5(out)

        out = self.stat_pool(out)

        out_embedding = self.embedding_layer1(out)

        return out_embedding