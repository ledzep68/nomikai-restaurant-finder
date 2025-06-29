import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Rating,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Slide,
  Zoom,
} from '@mui/material';
import {
  Feedback,
  Send,
  Close,
  BugReport,
  Lightbulb,
  ThumbUp,
  Star,
  CheckCircle,
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

interface FeedbackData {
  type: 'bug' | 'suggestion' | 'general';
  rating: number;
  category: string;
  message: string;
  email?: string;
  browserInfo: {
    userAgent: string;
    url: string;
    timestamp: string;
  };
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const UserFeedback: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [feedbackData, setFeedbackData] = useState<Partial<FeedbackData>>({
    type: 'general',
    rating: 0,
    category: '',
    message: '',
    email: '',
  });

  const feedbackCategories = {
    bug: ['UI/デザイン', '機能不具合', 'パフォーマンス', 'データエラー', 'その他'],
    suggestion: ['新機能', 'UI改善', 'パフォーマンス向上', 'ユーザビリティ', 'その他'],
    general: ['使いやすさ', '機能性', 'デザイン', '速度', 'その他'],
  };

  const handleOpen = () => {
    setOpen(true);
    setSubmitted(false);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setFeedbackData({
        type: 'general',
        rating: 0,
        category: '',
        message: '',
        email: '',
      });
      setSubmitted(false);
    }, 300);
  };

  const handleSubmit = async () => {
    if (!feedbackData.message?.trim()) return;

    setSubmitting(true);

    try {
      const feedback: FeedbackData = {
        type: feedbackData.type || 'general',
        rating: feedbackData.rating || 0,
        category: feedbackData.category || '',
        message: feedbackData.message,
        email: feedbackData.email,
        browserInfo: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      };

      // ローカルストレージに保存（実際のアプリではAPIに送信）
      const existingFeedback = JSON.parse(localStorage.getItem('nomikai_feedback') || '[]');
      const newFeedback = [feedback, ...existingFeedback].slice(0, 50); // 最新50件を保持
      localStorage.setItem('nomikai_feedback', JSON.stringify(newFeedback));

      // 送信完了
      setSubmitted(true);
      setShowSuccess(true);
      
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = (feedbackData.message?.trim().length || 0) >= 10;


  const getFeedbackTitle = (type: string) => {
    switch (type) {
      case 'bug':
        return 'バグ報告';
      case 'suggestion':
        return '改善提案';
      default:
        return '一般的なフィードバック';
    }
  };

  return (
    <>
      {/* フィードバックボタン */}
      <Zoom in={!open} timeout={300}>
        <Tooltip title="フィードバックを送信" placement="left">
          <Fab
            color="primary"
            onClick={handleOpen}
            sx={{
              position: 'fixed',
              bottom: { xs: 16, sm: 24 },
              right: { xs: 16, sm: 24 },
              zIndex: 1000,
            }}
          >
            <Feedback />
          </Fab>
        </Tooltip>
      </Zoom>

      {/* フィードバックダイアログ */}
      <Dialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <Feedback color="primary" />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            フィードバック
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {submitted ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                フィードバックありがとうございました！
              </Typography>
              <Typography variant="body2" color="text.secondary">
                貴重なご意見をいただき、ありがとうございます。
                今後のサービス改善に活用させていただきます。
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* フィードバックタイプ */}
              <FormControl>
                <FormLabel>フィードバックの種類</FormLabel>
                <RadioGroup
                  value={feedbackData.type}
                  onChange={(e) => setFeedbackData(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'bug' | 'suggestion' | 'general',
                    category: '' // カテゴリをリセット
                  }))}
                  row
                >
                  <FormControlLabel
                    value="general"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ThumbUp fontSize="small" />
                        一般
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="bug"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BugReport fontSize="small" />
                        バグ報告
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="suggestion"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Lightbulb fontSize="small" />
                        改善提案
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {/* 評価 */}
              {feedbackData.type === 'general' && (
                <Box>
                  <Typography component="legend" gutterBottom>
                    サービスの評価
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rating
                      value={feedbackData.rating}
                      onChange={(_, value) => setFeedbackData(prev => ({ ...prev, rating: value || 0 }))}
                      size="large"
                    />
                    <Typography variant="body2" color="text.secondary">
                      {(feedbackData.rating || 0) > 0 && `${feedbackData.rating}/5`}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* カテゴリ */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  カテゴリ
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(feedbackCategories[feedbackData.type || 'general'] || []).map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      clickable
                      color={feedbackData.category === category ? 'primary' : 'default'}
                      variant={feedbackData.category === category ? 'filled' : 'outlined'}
                      onClick={() => setFeedbackData(prev => ({ ...prev, category }))}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>

              {/* メッセージ */}
              <TextField
                label="詳細メッセージ"
                multiline
                rows={4}
                value={feedbackData.message}
                onChange={(e) => setFeedbackData(prev => ({ ...prev, message: e.target.value }))}
                placeholder={`${getFeedbackTitle(feedbackData.type || 'general')}の詳細をお聞かせください...`}
                helperText={`${feedbackData.message?.length || 0}/1000文字 (最低10文字)`}
                inputProps={{ maxLength: 1000 }}
                error={feedbackData.message !== undefined && feedbackData.message.length > 0 && feedbackData.message.length < 10}
                fullWidth
              />

              {/* メールアドレス */}
              <TextField
                label="メールアドレス（任意）"
                type="email"
                value={feedbackData.email}
                onChange={(e) => setFeedbackData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="返信が必要な場合はご入力ください"
                helperText="回答が必要な場合のみご入力ください"
                fullWidth
              />

              <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                フィードバックは匿名で収集され、サービス改善のためのみに使用されます。
              </Alert>
            </Box>
          )}
        </DialogContent>

        {!submitted && (
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleClose} disabled={submitting}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!isValid || submitting}
              startIcon={submitting ? <Star /> : <Send />}
            >
              {submitting ? '送信中...' : '送信'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* 成功通知 */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSuccess(false)}
          severity="success"
          variant="filled"
          icon={<CheckCircle />}
        >
          フィードバックを送信しました
        </Alert>
      </Snackbar>
    </>
  );
};