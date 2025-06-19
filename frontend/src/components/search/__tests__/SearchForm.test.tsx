import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SearchForm from '../SearchForm';
import authReducer from '@store/authSlice';
import restaurantReducer from '@store/restaurantSlice';
import searchReducer from '@store/searchSlice';

// Mock modules
jest.mock('@services/restaurantService');

const theme = createTheme();

// Test store factory
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      restaurant: restaurantReducer,
      search: searchReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      },
      restaurant: {
        current: null,
        searchResults: null,
        evaluations: [],
        favorites: [],
        loading: false,
        error: null,
      },
      search: {
        query: {
          location: '',
          page: 1,
          limit: 20,
          sort: 'rating',
        },
        results: null,
        filters: {
          genres: [],
          priceRanges: [],
          capacities: [],
          sortOptions: [],
        },
        history: [],
        loading: false,
        error: null,
      },
      ...initialState,
    },
  });
};

// Test wrapper component
const TestWrapper: React.FC<{ store: any; children: React.ReactNode }> = ({ 
  store, 
  children 
}) => (
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </Provider>
);

describe('SearchForm', () => {
  let mockOnSearch: jest.Mock;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockOnSearch = jest.fn();
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('基本的なレンダリング', () => {
    it('フォーム要素が正しくレンダリングされる', () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      expect(screen.getByText('レストラン検索')).toBeInTheDocument();
      expect(screen.getByTestId('location-input')).toBeInTheDocument();
      expect(screen.getByTestId('genre-select')).toBeInTheDocument();
      expect(screen.getByTestId('price-range-slider')).toBeInTheDocument();
      expect(screen.getByTestId('capacity-select')).toBeInTheDocument();
      expect(screen.getByTestId('search-button')).toBeInTheDocument();
      expect(screen.getByTestId('clear-button')).toBeInTheDocument();
    });

    it('初期値が正しく設定される', () => {
      const store = createTestStore({
        search: {
          query: {
            location: '渋谷',
            genre: 'japanese',
            priceRange: { min: 2000, max: 4000 },
            capacity: 6,
            page: 1,
            limit: 20,
            sort: 'rating',
          },
          results: null,
          filters: {
            genres: [],
            priceRanges: [],
            capacities: [],
            sortOptions: [],
          },
          history: [],
          loading: false,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input') as HTMLInputElement;
      expect(locationInput.value).toBe('渋谷');
    });
  });

  describe('フォームバリデーション', () => {
    it('場所が未入力の場合はエラーメッセージが表示される', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const searchButton = screen.getByTestId('search-button');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('場所を入力してください')).toBeInTheDocument();
      });
    });

    it('場所が2文字未満の場合はエラーメッセージが表示される', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, 'a');
      
      const searchButton = screen.getByTestId('search-button');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('場所は2文字以上で入力してください')).toBeInTheDocument();
      });
    });

    it('有効な入力の場合はエラーメッセージが表示されない', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, '渋谷');

      const searchButton = screen.getByTestId('search-button');
      expect(searchButton).not.toBeDisabled();
    });
  });

  describe('フォーム操作', () => {
    it('場所の入力ができる', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, '新宿');

      expect(locationInput).toHaveValue('新宿');
    });

    it('ジャンルの選択ができる', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const genreSelect = screen.getByTestId('genre-select');
      await user.click(genreSelect);
      
      const japaneseOption = screen.getByText('和食');
      await user.click(japaneseOption);

      expect(screen.getByDisplayValue('japanese')).toBeInTheDocument();
    });

    it('人数の選択ができる', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const capacitySelect = screen.getByTestId('capacity-select');
      await user.click(capacitySelect);
      
      const sixPeopleOption = screen.getByText('6人');
      await user.click(sixPeopleOption);

      expect(screen.getByDisplayValue('6')).toBeInTheDocument();
    });

    it('価格帯チップをクリックして価格範囲を設定できる', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const priceChip = screen.getByTestId('price-chip-2000-3000');
      await user.click(priceChip);

      // 価格範囲の表示が更新されることを確認
      await waitFor(() => {
        expect(screen.getByText(/¥2,000 ～ ¥3,000/)).toBeInTheDocument();
      });
    });
  });

  describe('フォーム送信', () => {
    it('有効な入力でフォーム送信ができる', async () => {
      const store = createTestStore();
      const { getByTestId } = render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      // フォーム入力
      const locationInput = getByTestId('location-input');
      await user.type(locationInput, '渋谷');

      const genreSelect = getByTestId('genre-select');
      await user.click(genreSelect);
      const japaneseOption = screen.getByText('和食');
      await user.click(japaneseOption);

      // フォーム送信
      const searchButton = getByTestId('search-button');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });
    });

    it('検索中はボタンが無効化される', async () => {
      const store = createTestStore({
        search: {
          query: { location: '', page: 1, limit: 20, sort: 'rating' },
          results: null,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: true,
          error: null,
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const searchButton = screen.getByTestId('search-button');
      expect(searchButton).toBeDisabled();
      expect(searchButton).toHaveTextContent('検索中...');
    });
  });

  describe('クリア機能', () => {
    it('クリアボタンでフォームがリセットされる', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      // フォームに入力
      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, '渋谷');

      // クリアボタンクリック
      const clearButton = screen.getByTestId('clear-button');
      await user.click(clearButton);

      // フォームがリセットされることを確認
      expect(locationInput).toHaveValue('');
    });
  });

  describe('エラー処理', () => {
    it('検索エラー時にエラーメッセージが表示される', () => {
      const store = createTestStore({
        search: {
          query: { location: '', page: 1, limit: 20, sort: 'rating' },
          results: null,
          filters: { genres: [], priceRanges: [], capacities: [], sortOptions: [] },
          history: [],
          loading: false,
          error: '検索に失敗しました',
        },
      });

      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      expect(screen.getByText('検索に失敗しました')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('必要なラベルとaria属性が設定されている', () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('場所')).toBeInTheDocument();
      expect(screen.getByLabelText('ジャンル')).toBeInTheDocument();
      expect(screen.getByLabelText('人数')).toBeInTheDocument();
    });

    it('フォーム送信時にフォーカス管理が適切に行われる', async () => {
      const store = createTestStore();
      render(
        <TestWrapper store={store}>
          <SearchForm onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const locationInput = screen.getByTestId('location-input');
      await user.type(locationInput, '渋谷');

      const searchButton = screen.getByTestId('search-button');
      await user.click(searchButton);

      // フォーカスが適切に管理されることを確認
      expect(document.activeElement).toBe(searchButton);
    });
  });
});