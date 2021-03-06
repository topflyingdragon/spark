module.exports = {
    props: ['user'],

    /**
     * The component's data.
     */
    data() {
        return {
            monthlyRecurringRevenue: 0,
            yearlyRecurringRevenue: 0,
            totalVolume: 0,
            genericTrialUsers: 0,

            indicators: [],
            lastMonthsIndicators: null,
            lastYearsIndicators: null,

            plans: []
        };
    },


    events: {
        /**
         * Handle this component becoming the active tab.
         */
        sparkHashChanged: function (hash) {
            if (hash == 'metrics' && this.yearlyRecurringRevenue === 0) {
                this.getRevenue();
                this.getPlans();
                this.getTrialUsers();
                this.getPerformanceIndicators();
            }
        }
    },


    methods: {
        /**
         * Get the revenue information for the application.
         */
        getRevenue() {
            this.$http.get('/spark/kiosk/performance-indicators/revenue')
                .then(response => {
                    this.yearlyRecurringRevenue = response.json().yearlyRecurringRevenue;
                    this.monthlyRecurringRevenue = response.json().monthlyRecurringRevenue;
                    this.totalVolume = response.json().totalVolume;
                });
        },


        /**
         * Get the subscriber information for the application.
         */
        getPlans() {
            this.$http.get('/spark/kiosk/performance-indicators/plans')
                .then(response => {
                    this.plans = response.json();
                });
        },


        /**
         * Get the number of users that are on a generic trial.
         */
        getTrialUsers() {
            this.$http.get('/spark/kiosk/performance-indicators/trialing')
                .then(response => {
                    this.genericTrialUsers = response.json();
                });
        },


        /**
         * Get the performance indicators for the application.
         */
        getPerformanceIndicators() {
            this.$http.get('/spark/kiosk/performance-indicators')
                .then(response => {
                    this.indicators = response.json().indicators;
                    this.lastMonthsIndicators = response.json().last_month;
                    this.lastYearsIndicators = response.json().last_year;

                    Vue.nextTick(() => {
                        this.drawCharts();
                    });
                });
        },


        /**
         * Draw the performance indicator charts.
         */
        drawCharts() {
            this.drawMonthlyRecurringRevenueChart();
            this.drawYearlyRecurringRevenueChart();
            this.drawDailyVolumeChart();
            this.drawNewUsersChart();
        },


        /**
         * Draw the monthly recurring revenue chart.
         */
        drawMonthlyRecurringRevenueChart() {
            return this.drawCurrencyChart(
                'monthlyRecurringRevenueChart', 30, indicator => indicator.monthly_recurring_revenue
            );
        },


        /**
         * Draw the yearly recurring revenue chart.
         */
        drawYearlyRecurringRevenueChart() {
            return this.drawCurrencyChart(
                'yearlyRecurringRevenueChart', 30, indicator => indicator.yearly_recurring_revenue
            );
        },


        /**
         * Draw the daily volume chart.
         */
        drawDailyVolumeChart() {
            return this.drawCurrencyChart(
                'dailyVolumeChart', 14, indicator => indicator.daily_volume
            );
        },


        /**
         * Draw the daily new users chart.
         */
        drawNewUsersChart() {
            return this.drawChart(
                'newUsersChart', 14, indicator => indicator.new_users
            );
        },


        /**
         * Draw a chart with currency formatting on the Y-Axis.
         */
        drawCurrencyChart(id, days, dataGatherer) {
            return this.drawChart(id, days, dataGatherer, value =>
                Vue.filter('currency')(value.value, Spark.currencySymbol)
            );
        },


        /**
         * Draw a chart with the given parameters.
         */
        drawChart(id, days, dataGatherer, scaleLabelFormatter) {
            var dataset = this.baseChartDataSet;

            dataset.data = _.map(_.last(this.indicators, days), dataGatherer);

             // Here we will build out the dataset for the chart. This will contain the dates and data
             // points for the chart. Each chart on the Kiosk only gets one dataset so we only need
             // to add it a single element to this array here. But, charts could have more later.
            var data = {
                labels: _.last(this.availableChartDates, days),
                datasets: [dataset]
            };

            var options = { responsive: true };

             // If a scale label formatter was passed, we will hand that to this chart library to fill
             // out the Y-Axis labels. This is particularly useful when we want to format them as a
             // currency as we do on all of our revenue charts that we display on the Kiosk here.
            if (arguments.length === 4) {
                options.scaleLabel = scaleLabelFormatter;
            }

            var chart = new Chart(
                document.getElementById(id).getContext('2d')
            ).Line(data, options);
        },


        /**
         * Calculate the percent change between two numbers.
         */
        percentChange(current, previous) {
            var change = Math.round(((current - previous) / previous) * 100);

            return change > 0 ? '+' + change.toFixed(0) : change.toFixed(0);
        }
    },


    computed: {
        /**
         * Calculate the monthly change in monthly recurring revenue.
         */
        monthlyChangeInMonthlyRecurringRevenue() {
            if ( ! this.lastMonthsIndicators || ! this.indicators) {
                return false;
            }

            return this.percentChange(
                _.last(this.indicators).monthly_recurring_revenue,
                this.lastMonthsIndicators.monthly_recurring_revenue
            );
        },


        /**
         * Calculate the yearly change in monthly recurring revenue.
         */
        yearlyChangeInMonthlyRecurringRevenue() {
            if ( ! this.lastYearsIndicators || ! this.indicators) {
                return false;
            }

            return this.percentChange(
                _.last(this.indicators).monthly_recurring_revenue,
                this.lastYearsIndicators.monthly_recurring_revenue
            );
        },


        /**
         * Calculate the monthly change in yearly recurring revenue.
         */
        monthlyChangeInYearlyRecurringRevenue() {
            if ( ! this.lastMonthsIndicators || ! this.indicators) {
                return false;
            }

            return this.percentChange(
                _.last(this.indicators).yearly_recurring_revenue,
                this.lastMonthsIndicators.yearly_recurring_revenue
            );
        },


        /**
         * Calculate the yearly change in yearly recurring revenue.
         */
        yearlyChangeInYearlyRecurringRevenue() {
            if ( ! this.lastYearsIndicators || ! this.indicators) {
                return false;
            }
;
            return this.percentChange(
                _.last(this.indicators).yearly_recurring_revenue,
                this.lastYearsIndicators.yearly_recurring_revenue
            );
        },


        /**
         * Get the total number of users trialing.
         */
        totalTrialUsers() {
            return this.genericTrialUsers + _.reduce(this.plans, (memo, plan) => {
                return memo + plan.trialing;
            }, 0);
        },


        /**
         * Get the available, formatted chart dates for the current indicators.
         */
        availableChartDates() {
            return _.map(this.indicators, indicator => {
                return moment(indicator.created_at).format('M/D');
            });
        },


        /**
         * Get the base chart data set.
         */
        baseChartDataSet() {
            return {
                label: "Dataset",
                fillColor: "rgba(151,187,205,0.2)",
                strokeColor: "rgba(151,187,205,1)",
                pointColor: "rgba(151,187,205,1)",
                pointStrokeColor: "#fff",
                pointHighlightFill: "#fff",
                pointHighlightStroke: "rgba(151,187,205,1)",
            };
        }
    }
};
