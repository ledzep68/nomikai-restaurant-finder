#!/bin/bash

# HotPepper無料Tier Restaurant Finder - ヘルスチェックスクリプト
# 作成日: 2025年6月21日
# 用途: システム全体のヘルスチェック

set -e

# 色付きログ用の定数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3001}"
TIMEOUT="${TIMEOUT:-30}"
VERBOSE="${VERBOSE:-false}"

# ログ出力関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# HTTP ヘルスチェック関数
check_http_endpoint() {
    local url="$1"
    local description="$2"
    local expected_status="${3:-200}"
    
    log_info "Checking $description: $url"
    
    if response=$(curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null); then
        status_code="${response: -3}"
        body="${response%???}"
        
        if [ "$status_code" = "$expected_status" ]; then
            log_success "$description is healthy (HTTP $status_code)"
            if [ "$VERBOSE" = "true" ]; then
                echo "Response: $body" | head -n 3
            fi
            return 0
        else
            log_error "$description returned HTTP $status_code (expected $expected_status)"
            return 1
        fi
    else
        log_error "$description is unreachable"
        return 1
    fi
}

# データベース接続チェック
check_database() {
    log_info "Checking database connection..."
    
    if command -v pg_isready &> /dev/null; then
        if pg_isready -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" &> /dev/null; then
            log_success "Database is accepting connections"
            return 0
        else
            log_error "Database is not accepting connections"
            return 1
        fi
    else
        log_warning "pg_isready not found, skipping direct database check"
        # API経由でのデータベース接続確認
        check_http_endpoint "$API_BASE_URL/api/health/database" "Database (via API)"
    fi
}

# Redis接続チェック
check_redis() {
    log_info "Checking Redis connection..."
    
    if command -v redis-cli &> /dev/null; then
        if echo "PING" | redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" | grep -q "PONG"; then
            log_success "Redis is responding"
            return 0
        else
            log_error "Redis is not responding"
            return 1
        fi
    else
        log_warning "redis-cli not found, skipping direct Redis check"
        # API経由でのRedis接続確認
        check_http_endpoint "$API_BASE_URL/api/health/cache" "Redis (via API)"
    fi
}

# API使用量チェック
check_api_usage() {
    log_info "Checking API usage limits..."
    
    if response=$(curl -s --max-time "$TIMEOUT" "$API_BASE_URL/api/monitoring/usage" 2>/dev/null); then
        # HotPepper使用量チェック
        hotpepper_daily=$(echo "$response" | grep -o '"daily":{"used":[0-9]*,"limit":[0-9]*' | grep -o '"used":[0-9]*' | cut -d':' -f2)
        hotpepper_limit=$(echo "$response" | grep -o '"daily":{"used":[0-9]*,"limit":[0-9]*' | grep -o '"limit":[0-9]*' | cut -d':' -f2)
        
        if [ -n "$hotpepper_daily" ] && [ -n "$hotpepper_limit" ]; then
            usage_percentage=$((hotpepper_daily * 100 / hotpepper_limit))
            
            if [ "$usage_percentage" -lt 80 ]; then
                log_success "HotPepper API usage: $hotpepper_daily/$hotpepper_limit ($usage_percentage%)"
            elif [ "$usage_percentage" -lt 90 ]; then
                log_warning "HotPepper API usage high: $hotpepper_daily/$hotpepper_limit ($usage_percentage%)"
            else
                log_error "HotPepper API usage critical: $hotpepper_daily/$hotpepper_limit ($usage_percentage%)"
                return 1
            fi
        else
            log_warning "Could not parse API usage data"
        fi
        return 0
    else
        log_error "Could not retrieve API usage information"
        return 1
    fi
}

# システムリソースチェック
check_system_resources() {
    log_info "Checking system resources..."
    
    # メモリ使用量
    if command -v free &> /dev/null; then
        memory_usage=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
        memory_percentage=${memory_usage%.*}
        
        if [ "$memory_percentage" -lt 80 ]; then
            log_success "Memory usage: ${memory_percentage}%"
        elif [ "$memory_percentage" -lt 90 ]; then
            log_warning "Memory usage high: ${memory_percentage}%"
        else
            log_error "Memory usage critical: ${memory_percentage}%"
        fi
    fi
    
    # ディスク使用量
    if command -v df &> /dev/null; then
        disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
        
        if [ "$disk_usage" -lt 80 ]; then
            log_success "Disk usage: ${disk_usage}%"
        elif [ "$disk_usage" -lt 90 ]; then
            log_warning "Disk usage high: ${disk_usage}%"
        else
            log_error "Disk usage critical: ${disk_usage}%"
        fi
    fi
}

# プロセスチェック
check_processes() {
    log_info "Checking application processes..."
    
    # PM2プロセス確認
    if command -v pm2 &> /dev/null; then
        if pm2 jlist 2>/dev/null | grep -q '"name":"nomikai"'; then
            running_processes=$(pm2 jlist | grep '"status":"online"' | wc -l)
            log_success "PM2 processes running: $running_processes"
        else
            log_warning "No PM2 processes found"
        fi
    fi
    
    # Dockerコンテナ確認
    if command -v docker &> /dev/null; then
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q nomikai; then
            running_containers=$(docker ps | grep nomikai | wc -l)
            log_success "Docker containers running: $running_containers"
        else
            log_warning "No Docker containers found"
        fi
    fi
}

# SSL証明書チェック
check_ssl_certificate() {
    if [ "$NODE_ENV" = "production" ] && [ -n "$DOMAIN_NAME" ]; then
        log_info "Checking SSL certificate for $DOMAIN_NAME..."
        
        if command -v openssl &> /dev/null; then
            expiry_date=$(echo | openssl s_client -servername "$DOMAIN_NAME" -connect "$DOMAIN_NAME:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
            
            if [ -n "$expiry_date" ]; then
                expiry_timestamp=$(date -d "$expiry_date" +%s)
                current_timestamp=$(date +%s)
                days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [ "$days_until_expiry" -gt 30 ]; then
                    log_success "SSL certificate valid for $days_until_expiry days"
                elif [ "$days_until_expiry" -gt 7 ]; then
                    log_warning "SSL certificate expires in $days_until_expiry days"
                else
                    log_error "SSL certificate expires in $days_until_expiry days - renewal required"
                fi
            else
                log_error "Could not retrieve SSL certificate information"
            fi
        else
            log_warning "openssl not found, skipping SSL certificate check"
        fi
    fi
}

# キャッシュ効率チェック
check_cache_efficiency() {
    log_info "Checking cache efficiency..."
    
    if response=$(curl -s --max-time "$TIMEOUT" "$API_BASE_URL/api/health/cache" 2>/dev/null); then
        hit_rate=$(echo "$response" | grep -o '"hitRate":[0-9.]*' | cut -d':' -f2)
        
        if [ -n "$hit_rate" ]; then
            hit_rate_percentage=$(echo "$hit_rate * 100" | bc 2>/dev/null || echo "$hit_rate")
            hit_rate_int=${hit_rate_percentage%.*}
            
            if [ "$hit_rate_int" -ge 80 ]; then
                log_success "Cache hit rate: ${hit_rate_percentage}%"
            elif [ "$hit_rate_int" -ge 60 ]; then
                log_warning "Cache hit rate: ${hit_rate_percentage}%"
            else
                log_error "Cache hit rate low: ${hit_rate_percentage}%"
            fi
        else
            log_warning "Could not retrieve cache hit rate"
        fi
    else
        log_error "Could not check cache efficiency"
    fi
}

# エラーログチェック
check_error_logs() {
    log_info "Checking recent error logs..."
    
    error_log_paths=(
        "logs/error.log"
        "/var/log/nomikai/error.log"
        "backend/logs/error.log"
    )
    
    for log_path in "${error_log_paths[@]}"; do
        if [ -f "$log_path" ]; then
            recent_errors=$(tail -n 100 "$log_path" | grep -c "ERROR\|FATAL" || echo "0")
            
            if [ "$recent_errors" -eq 0 ]; then
                log_success "No recent errors in $log_path"
            elif [ "$recent_errors" -lt 5 ]; then
                log_warning "$recent_errors recent errors in $log_path"
            else
                log_error "$recent_errors recent errors in $log_path"
                if [ "$VERBOSE" = "true" ]; then
                    echo "Recent errors:"
                    tail -n 10 "$log_path" | grep "ERROR\|FATAL"
                fi
            fi
            return 0
        fi
    done
    
    log_warning "No error log files found"
}

# メイン実行関数
main() {
    echo "=========================================="
    echo "   HotPepper Restaurant Finder"
    echo "        Health Check Report"
    echo "=========================================="
    echo "Date: $(date)"
    echo "Environment: ${NODE_ENV:-development}"
    echo "=========================================="
    
    local total_checks=0
    local passed_checks=0
    local failed_checks=0
    
    # 各チェック実行
    checks=(
        "check_http_endpoint \"$API_BASE_URL/health\" \"API Health Endpoint\""
        "check_http_endpoint \"$FRONTEND_URL\" \"Frontend\" \"200\""
        "check_database"
        "check_redis"
        "check_api_usage"
        "check_system_resources"
        "check_processes"
        "check_ssl_certificate"
        "check_cache_efficiency"
        "check_error_logs"
    )
    
    for check in "${checks[@]}"; do
        total_checks=$((total_checks + 1))
        
        echo ""
        if eval "$check"; then
            passed_checks=$((passed_checks + 1))
        else
            failed_checks=$((failed_checks + 1))
        fi
    done
    
    # サマリー表示
    echo ""
    echo "=========================================="
    echo "           Health Check Summary"
    echo "=========================================="
    echo "Total Checks: $total_checks"
    echo -e "Passed: ${GREEN}$passed_checks${NC}"
    echo -e "Failed: ${RED}$failed_checks${NC}"
    echo "Success Rate: $(echo "scale=1; $passed_checks * 100 / $total_checks" | bc)%"
    echo "=========================================="
    
    # 全体の健康状態判定
    if [ "$failed_checks" -eq 0 ]; then
        log_success "System is HEALTHY"
        exit 0
    elif [ "$failed_checks" -le 2 ]; then
        log_warning "System is DEGRADED ($failed_checks issues found)"
        exit 1
    else
        log_error "System is UNHEALTHY ($failed_checks critical issues found)"
        exit 2
    fi
}

# ヘルプ表示
show_help() {
    echo "HotPepper Restaurant Finder Health Check Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -v, --verbose       Enable verbose output"
    echo "  -t, --timeout SEC   Set HTTP timeout (default: 30)"
    echo "  --api-url URL       API base URL (default: http://localhost:3000)"
    echo "  --frontend-url URL  Frontend URL (default: http://localhost:3001)"
    echo ""
    echo "Environment Variables:"
    echo "  NODE_ENV           Environment (development/staging/production)"
    echo "  DOMAIN_NAME        Domain name for SSL check (production only)"
    echo "  DB_HOST            Database host"
    echo "  REDIS_HOST         Redis host"
    echo ""
    echo "Exit Codes:"
    echo "  0  System is healthy"
    echo "  1  System is degraded (minor issues)"
    echo "  2  System is unhealthy (critical issues)"
}

# コマンドライン引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --api-url)
            API_BASE_URL="$2"
            shift 2
            ;;
        --frontend-url)
            FRONTEND_URL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# メイン実行
main