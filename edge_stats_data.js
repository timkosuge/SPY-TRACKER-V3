
(function(){
const ES_DATA = {"all_time":{"seasonality":[{"month":"Jan","avg_return":0.38,"median_return":1.08,"win_rate":58.8,"avg_vol":13.25,"count":34,"best":9.74,"worst":-8.41,"daily_avg":0.04,"daily_win_rate":55.4,"daily_count":672},{"month":"Feb","avg_return":-0.14,"median_return":0.48,"win_rate":58.8,"avg_vol":13.43,"count":34,"best":5.3,"worst":-9.59,"daily_avg":0.0,"daily_win_rate":53.7,"daily_count":652},{"month":"Mar","avg_return":0.41,"median_return":1.12,"win_rate":58.8,"avg_vol":16.77,"count":34,"best":9.65,"worst":-13.57,"daily_avg":0.03,"daily_win_rate":51.1,"daily_count":743},{"month":"Apr","avg_return":1.83,"median_return":1.0,"win_rate":72.7,"avg_vol":13.88,"count":33,"best":17.14,"worst":-9.11,"daily_avg":0.09,"daily_win_rate":55.8,"daily_count":681},{"month":"May","avg_return":1.0,"median_return":1.41,"win_rate":72.7,"avg_vol":12.35,"count":33,"best":6.66,"worst":-8.38,"daily_avg":0.05,"daily_win_rate":52.7,"daily_count":698},{"month":"Jun","avg_return":0.0,"median_return":0.1,"win_rate":51.5,"avg_vol":11.98,"count":33,"best":6.43,"worst":-9.13,"daily_avg":0.0,"daily_win_rate":51.0,"daily_count":702},{"month":"Jul","avg_return":1.3,"median_return":1.33,"win_rate":66.7,"avg_vol":11.52,"count":33,"best":9.41,"worst":-8.09,"daily_avg":0.07,"daily_win_rate":56.0,"daily_count":697},{"month":"Aug","avg_return":-0.16,"median_return":0.99,"win_rate":63.6,"avg_vol":13.35,"count":33,"best":6.39,"worst":-14.12,"daily_avg":0.0,"daily_win_rate":52.8,"daily_count":731},{"month":"Sep","avg_return":-0.83,"median_return":0.3,"win_rate":51.5,"avg_vol":13.86,"count":33,"best":6.93,"worst":-10.8,"daily_avg":-0.04,"daily_win_rate":49.2,"daily_count":671},{"month":"Oct","avg_return":1.68,"median_return":2.09,"win_rate":66.7,"avg_vol":15.63,"count":33,"best":11.57,"worst":-16.0,"daily_avg":0.08,"daily_win_rate":53.6,"daily_count":728},{"month":"Nov","avg_return":2.26,"median_return":2.62,"win_rate":75.8,"avg_vol":13.61,"count":33,"best":9.65,"worst":-7.01,"daily_avg":0.12,"daily_win_rate":59.3,"daily_count":674},{"month":"Dec","avg_return":0.25,"median_return":0.57,"win_rate":60.6,"avg_vol":11.91,"count":33,"best":6.18,"worst":-10.83,"daily_avg":0.02,"daily_win_rate":52.9,"daily_count":697}],"quarterly":[{"quarter":"Q1 (Jan\u2013Mar)","q_num":1,"monthly_avg":0.22,"monthly_win_rate":58.8,"monthly_count":102,"daily_avg":0.02,"daily_win_rate":53.3,"daily_count":2067,"avg_vol":14.48,"best":9.74,"worst":-13.57},{"quarter":"Q2 (Apr\u2013Jun)","q_num":2,"monthly_avg":0.94,"monthly_win_rate":65.7,"monthly_count":99,"daily_avg":0.05,"daily_win_rate":53.1,"daily_count":2081,"avg_vol":12.74,"best":17.14,"worst":-9.13},{"quarter":"Q3 (Jul\u2013Sep)","q_num":3,"monthly_avg":0.11,"monthly_win_rate":60.6,"monthly_count":99,"daily_avg":0.01,"daily_win_rate":52.7,"daily_count":2099,"avg_vol":12.91,"best":9.41,"worst":-14.12},{"quarter":"Q4 (Oct\u2013Dec)","q_num":4,"monthly_avg":1.4,"monthly_win_rate":67.7,"monthly_count":99,"daily_avg":0.08,"daily_win_rate":55.2,"daily_count":2099,"avg_vol":13.71,"best":11.57,"worst":-16.0}],"yearly_summary":{"avg":9.29,"median":11.82,"win_rate":70.6,"best":34.53,"worst":-38.42,"count":34,"years":[{"year":1993,"return":5.96,"true_range":4.35,"green":true},{"year":1994,"return":-2.21,"true_range":4.97,"green":false},{"year":1995,"return":34.53,"true_range":17.11,"green":true},{"year":1996,"return":20.24,"true_range":17.05,"green":true},{"year":1997,"return":30.49,"true_range":26.25,"green":true},{"year":1998,"return":26.72,"true_range":33.84,"green":true},{"year":1999,"return":19.05,"true_range":27.18,"green":true},{"year":2000,"return":-11.51,"true_range":30.22,"green":false},{"year":2001,"return":-13.41,"true_range":44.9,"green":false},{"year":2002,"return":-23.35,"true_range":40.92,"green":false},{"year":2003,"return":25.24,"true_range":32.14,"green":true},{"year":2004,"return":8.17,"true_range":15.07,"green":true},{"year":2005,"return":2.43,"true_range":14.54,"green":true},{"year":2006,"return":13.12,"true_range":20.9,"green":true},{"year":2007,"return":2.78,"true_range":20.77,"green":true},{"year":2008,"return":-38.42,"true_range":72.65,"green":false},{"year":2009,"return":23.22,"true_range":45.93,"green":true},{"year":2010,"return":11.91,"true_range":25.07,"green":true},{"year":2011,"return":-0.95,"true_range":29.75,"green":false},{"year":2012,"return":11.47,"true_range":21.68,"green":true},{"year":2013,"return":27.28,"true_range":39.96,"green":true},{"year":2014,"return":11.72,"true_range":39.26,"green":true},{"year":2015,"return":-1.22,"true_range":31.38,"green":false},{"year":2016,"return":11.49,"true_range":47.32,"green":true},{"year":2017,"return":18.58,"true_range":44.72,"green":true},{"year":2018,"return":-6.69,"true_range":60.18,"green":false},{"year":2019,"return":30.85,"true_range":80.13,"green":true},{"year":2020,"return":15.56,"true_range":160.2,"green":true},{"year":2021,"return":26.55,"true_range":114.18,"green":true},{"year":2022,"return":-19.71,"true_range":131.87,"green":false},{"year":2023,"return":23.66,"true_range":99.72,"green":true},{"year":2024,"return":24.13,"true_range":142.64,"green":true},{"year":2025,"return":15.7,"true_range":209.86,"green":true},{"year":2026,"return":-7.53,"true_range":64.73,"green":false}]},"santa":{"nov_avg":2.26,"nov_win":75.8,"dec_avg":0.25,"dec_win":60.6,"novdec_avg":1.25,"novdec_win":68.2,"rest_avg":0.55,"rest_win":62.2,"count":33,"nov_daily_avg":0.12,"nov_daily_win":59.3,"dec_daily_avg":0.02,"dec_daily_win":52.9},"streaks":{"weekly":{"max_green":10,"max_red":8,"after_2green_avg":0.09,"after_2green_winrate":55.6,"after_2red_avg":0.43,"after_2red_winrate":58.0,"p_green_after_green":53.3,"p_green_after_red":56.6,"after_3green_avg":0.2,"after_3green_winrate":57.7,"after_3red_avg":0.64,"after_3red_winrate":57.4},"monthly":{"max_green":9,"max_red":5,"p_green_after_green":63.5},"yearly":{"max_green":5,"max_red":3},"daily":{"max_green":14,"max_red":9,"after_2green_avg":0.02,"after_2green_winrate":52.5,"after_2red_avg":0.12,"after_2red_winrate":56.3,"p_green_after_green":52.4,"p_green_after_red":55.0}},"recovery":{"dd5":{"count":22,"avg_weeks":47.6,"median_weeks":13.0,"max_weeks":372},"dd10":{"count":9,"avg_weeks":93.3,"median_weeks":25.0,"max_weeks":372},"dd15":{"count":7,"avg_weeks":107.9,"median_weeks":23.0,"max_weeks":334},"dd20":{"count":4,"avg_weeks":168.2,"median_weeks":163.0,"max_weeks":324}},"vol_edge":{"weekly_buckets":[{"bucket":"Very Low (0\u201320%)","threshold_low":0.22,"threshold_high":2.28,"self_avg":0.2,"self_winrate":57.5,"after_avg":0.15,"after_winrate":53.8,"count":351},{"bucket":"Low (20\u201340%)","threshold_low":2.29,"threshold_high":3.44,"self_avg":0.28,"self_winrate":57.7,"after_avg":0.09,"after_winrate":53.0,"count":345},{"bucket":"Medium (40\u201360%)","threshold_low":3.45,"threshold_high":5.03,"self_avg":0.25,"self_winrate":53.4,"after_avg":0.24,"after_winrate":58.0,"count":343},{"bucket":"High (60\u201380%)","threshold_low":5.04,"threshold_high":8.7,"self_avg":0.07,"self_winrate":53.2,"after_avg":0.05,"after_winrate":52.3,"count":346},{"bucket":"Very High (80\u2013100%)","threshold_low":8.71,"threshold_high":66.82,"self_avg":-0.02,"self_winrate":52.0,"after_avg":0.24,"after_winrate":56.8,"count":346}],"daily_buckets":[{"bucket":"Very Low (0\u201320%)","threshold_low":0.06,"threshold_high":0.87,"self_avg":0.09,"self_winrate":57.5,"after_avg":0.05,"after_winrate":53.4,"count":1671},{"bucket":"Low (20\u201340%)","threshold_low":0.87,"threshold_high":1.37,"self_avg":0.13,"self_winrate":58.0,"after_avg":0.02,"after_winrate":53.4,"count":1672},{"bucket":"Medium (40\u201360%)","threshold_low":1.37,"threshold_high":2.0,"self_avg":0.09,"self_winrate":53.6,"after_avg":0.02,"after_winrate":52.6,"count":1674},{"bucket":"High (60\u201380%)","threshold_low":2.01,"threshold_high":3.37,"self_avg":-0.02,"self_winrate":50.1,"after_avg":0.04,"after_winrate":54.5,"count":1660},{"bucket":"Very High (80\u2013100%)","threshold_low":3.37,"threshold_high":55.57,"self_avg":-0.09,"self_winrate":48.7,"after_avg":0.07,"after_winrate":54.1,"count":1669}],"after_consec_hivol_avg":0.59,"after_consec_hivol_winrate":72.3,"weekly_avg_tr":6.09,"daily_avg_tr":2.42,"hi_vol_threshold":8.7,"lo_vol_threshold":2.28,"hi_vol_self_avg":-0.04,"hi_vol_self_winrate":51.7,"lo_vol_self_avg":0.2,"risk_adj_all":0.0253},"week_of_month":[{"week":"Week 1","avg_return":0.26,"median_return":0.46,"win_rate":58.5,"count":398,"best":6.63,"worst":-8.22},{"week":"Week 2","avg_return":0.12,"median_return":0.18,"win_rate":55.0,"count":398,"best":11.98,"worst":-17.41},{"week":"Week 3","avg_return":0.08,"median_return":0.05,"win_rate":51.0,"count":398,"best":7.5,"worst":-7.94},{"week":"Week 4","avg_return":0.17,"median_return":0.3,"win_rate":55.5,"count":398,"best":11.06,"worst":-8.72},{"week":"Week 5","avg_return":0.12,"median_return":0.09,"win_rate":51.8,"count":139,"best":12.63,"worst":-4.56}],"day_of_week":[{"day":"Monday","avg_return":0.0557,"median_return":0.0773,"win_rate":55.5,"avg_range":2.29,"count":1568,"best":14.52,"worst":-10.94,"after_green_avg":0.05,"after_red_avg":0.06},{"day":"Tuesday","avg_return":0.0701,"median_return":0.0463,"win_rate":52.0,"avg_range":2.37,"count":1714,"best":11.69,"worst":-5.28,"after_green_avg":-0.01,"after_red_avg":0.17},{"day":"Wednesday","avg_return":0.059,"median_return":0.0855,"win_rate":55.3,"avg_range":2.47,"count":1712,"best":10.5,"worst":-9.84,"after_green_avg":0.03,"after_red_avg":0.09},{"day":"Thursday","avg_return":0.0115,"median_return":0.0609,"win_rate":53.1,"avg_range":2.52,"count":1679,"best":6.23,"worst":-9.57,"after_green_avg":0.03,"after_red_avg":-0.01},{"day":"Friday","avg_return":-0.0019,"median_return":0.0425,"win_rate":52.2,"avg_range":2.43,"count":1673,"best":8.55,"worst":-5.85,"after_green_avg":-0.03,"after_red_avg":0.03}],"holidays":{"thanksgiving_week":{"avg":-0.07,"median":0.26,"win_rate":60.6,"count":33,"best":2.51,"worst":-7.94},"thanksgiving_daily":{"avg":0.25,"median":0.23,"win_rate":64.2,"count":137,"best":6.93,"worst":-2.39},"christmas_week":{"avg":0.42,"median":0.7,"win_rate":72.7,"count":33,"best":3.55,"worst":-7.21},"christmas_daily":{"avg":0.25,"median":0.23,"win_rate":69.7,"count":132,"best":5.05,"worst":-2.64},"new_year_week":{"avg":-0.07,"median":-0.07,"win_rate":47.4,"count":19,"best":3.64,"worst":-1.93},"new_year_daily":{"avg":0.13,"median":0.18,"win_rate":56.2,"count":89,"best":4.8,"worst":-3.91},"july4_week":{"avg":0.52,"median":0.53,"win_rate":60.6,"count":33,"best":5.54,"worst":-5.4},"july4_daily":{"avg":0.13,"median":0.21,"win_rate":62.3,"count":61,"best":3.98,"worst":-2.73},"memorial_week":{"avg":0.31,"median":0.61,"win_rate":57.9,"count":38,"best":5.71,"worst":-2.76},"memorial_daily":{"avg":0.16,"median":0.13,"win_rate":56.8,"count":132,"best":3.35,"worst":-1.79},"labor_week":{"avg":-0.13,"median":0.43,"win_rate":60.6,"count":33,"best":4.04,"worst":-5.78},"labor_daily":{"avg":0.04,"median":0.05,"win_rate":52.0,"count":75,"best":4.23,"worst":-3.81},"mlk_daily":{"avg":-0.04,"median":0.06,"win_rate":52.2,"count":136,"best":4.32,"worst":-5.28},"presidents_daily":{"avg":-0.12,"median":-0.05,"win_rate":47.1,"count":136,"best":1.76,"worst":-4.28},"short_week":{"avg":0.29,"median":0.38,"win_rate":57.3,"count":300,"best":9.97,"worst":-5.96},"after_short_week":{"avg":0.29,"median":0.38,"win_rate":57.3,"count":300,"best":6.56,"worst":-8.32},"tax_loss_sell":{"avg":0.05,"median":0.04,"win_rate":53.5,"count":368,"best":5.05,"worst":-2.98},"tax_loss_buy":{"avg":0.12,"median":0.18,"win_rate":57.3,"count":206,"best":5.81,"worst":-3.91},"january_effect":{"avg":0.13,"median":0.16,"win_rate":55.8,"count":165,"best":5.81,"worst":-3.91},"sell_in_may":{"avg":0.03,"median":0.05,"win_rate":52.6,"count":4227,"best":14.52,"worst":-9.84},"buy_in_nov":{"avg":0.05,"median":0.08,"win_rate":54.6,"count":4119,"best":10.5,"worst":-10.94},"triple_witching":{"avg":-0.59,"median":-0.52,"win_rate":21.2,"count":132,"best":3.37,"worst":-4.87},"q4_earnings_oct":{"avg":0.09,"median":0.06,"win_rate":53.5,"count":398,"best":11.69,"worst":-9.84},"q4_earnings_nov":{"avg":0.13,"median":0.13,"win_rate":60.7,"count":354,"best":6.23,"worst":-5.54}},"daily_seasonality":[{"month":"Jan","avg_return":0.04,"win_rate":55.4,"count":672,"best":5.81,"worst":-5.28},{"month":"Feb","avg_return":0.0,"win_rate":53.7,"count":652,"best":3.79,"worst":-4.58},{"month":"Mar","avg_return":0.03,"win_rate":51.1,"count":743,"best":9.06,"worst":-10.94},{"month":"Apr","avg_return":0.09,"win_rate":55.8,"count":681,"best":10.5,"worst":-5.85},{"month":"May","avg_return":0.05,"win_rate":52.7,"count":698,"best":4.4,"worst":-4.03},{"month":"Jun","avg_return":0.0,"win_rate":51.0,"count":702,"best":3.18,"worst":-5.76},{"month":"Jul","avg_return":0.07,"win_rate":56.0,"count":697,"best":5.97,"worst":-3.64},{"month":"Aug","avg_return":0.0,"win_rate":52.8,"count":731,"best":4.65,"worst":-7.13},{"month":"Sep","avg_return":-0.04,"win_rate":49.2,"count":671,"best":5.37,"worst":-7.84},{"month":"Oct","avg_return":0.08,"win_rate":53.6,"count":728,"best":14.52,"worst":-9.84},{"month":"Nov","avg_return":0.12,"win_rate":59.3,"count":674,"best":6.93,"worst":-7.42},{"month":"Dec","avg_return":0.02,"win_rate":52.9,"count":697,"best":5.05,"worst":-8.86}],"daily_vol_edge":{"hi_vol_threshold":3.37,"lo_vol_threshold":0.87,"after_hivol_avg":0.07,"after_hivol_winrate":54.0,"after_lovol_avg":0.05,"after_lovol_winrate":53.4,"hi_vol_self_avg":-0.09,"hi_vol_self_winrate":48.7},"releases":{"cpi":{"before":{"avg":0.34,"median":0.46,"win_rate":59.2,"count":397,"best":7.23,"worst":-9.07},"during":{"avg":-0.01,"median":0.13,"win_rate":53.4,"count":397,"best":11.07,"worst":-19.79},"after":{"avg":0.09,"median":0.2,"win_rate":55.4,"count":397,"best":7.01,"worst":-15.05}},"nfp":{"before":{"avg":0.2,"median":0.23,"win_rate":56.8,"count":375,"best":13.75,"worst":-9.56},"during":{"avg":0.32,"median":0.49,"win_rate":60.9,"count":376,"best":7.55,"worst":-13.76},"after":{"avg":0.41,"median":0.53,"win_rate":63.6,"count":376,"best":10.36,"worst":-12.35}}},"meta":{"label":"All Time (1993\u20132026)","weekly_count":1731,"monthly_count":399,"daily_count":8346}},"since_2020":{"seasonality":[{"month":"Jan","avg_return":0.51,"median_return":0.91,"win_rate":57.1,"avg_vol":29.29,"count":7,"best":5.75,"worst":-5.54,"daily_avg":0.04,"daily_win_rate":53.9,"daily_count":141},{"month":"Feb","avg_return":-1.05,"median_return":-0.52,"win_rate":42.9,"avg_vol":32.57,"count":7,"best":4.84,"worst":-8.38,"daily_avg":-0.05,"daily_win_rate":51.5,"daily_count":134},{"month":"Mar","avg_return":-1.91,"median_return":2.77,"win_rate":57.1,"avg_vol":46.21,"count":7,"best":3.82,"worst":-13.57,"daily_avg":-0.07,"daily_win_rate":47.4,"daily_count":152},{"month":"Apr","avg_return":1.64,"median_return":0.6,"win_rate":50.0,"avg_vol":41.41,"count":6,"best":17.14,"worst":-9.11,"daily_avg":0.05,"daily_win_rate":54.0,"daily_count":124},{"month":"May","avg_return":2.99,"median_return":2.88,"win_rate":100.0,"avg_vol":32.28,"count":6,"best":6.66,"worst":0.15,"daily_avg":0.14,"daily_win_rate":58.7,"daily_count":126},{"month":"Jun","avg_return":1.29,"median_return":2.22,"win_rate":83.3,"avg_vol":30.9,"count":6,"best":6.03,"worst":-9.13,"daily_avg":0.07,"daily_win_rate":59.2,"daily_count":125},{"month":"Jul","avg_return":4.0,"median_return":2.96,"win_rate":100.0,"avg_vol":25.73,"count":6,"best":9.41,"worst":0.95,"daily_avg":0.19,"daily_win_rate":60.6,"daily_count":127},{"month":"Aug","avg_return":1.54,"median_return":2.28,"win_rate":66.7,"avg_vol":30.93,"count":6,"best":6.39,"worst":-3.41,"daily_avg":0.07,"daily_win_rate":56.1,"daily_count":132},{"month":"Sep","avg_return":-2.91,"median_return":-4.78,"win_rate":33.3,"avg_vol":36.33,"count":6,"best":4.5,"worst":-9.09,"daily_avg":-0.15,"daily_win_rate":49.2,"daily_count":124},{"month":"Oct","avg_return":1.71,"median_return":1.01,"win_rate":50.0,"avg_vol":32.11,"count":6,"best":6.96,"worst":-3.3,"daily_avg":0.09,"daily_win_rate":52.3,"daily_count":132},{"month":"Nov","avg_return":4.52,"median_return":4.98,"win_rate":66.7,"avg_vol":34.06,"count":6,"best":9.65,"worst":-1.03,"daily_avg":0.25,"daily_win_rate":64.8,"daily_count":122},{"month":"Dec","avg_return":0.11,"median_return":1.36,"win_rate":66.7,"avg_vol":25.68,"count":6,"best":4.29,"worst":-6.44,"daily_avg":0.02,"daily_win_rate":50.8,"daily_count":128}],"quarterly":[{"quarter":"Q1 (Jan\u2013Mar)","q_num":1,"monthly_avg":-0.82,"monthly_win_rate":52.4,"monthly_count":21,"daily_avg":-0.03,"daily_win_rate":50.8,"daily_count":427,"avg_vol":36.02,"best":5.75,"worst":-13.57},{"quarter":"Q2 (Apr\u2013Jun)","q_num":2,"monthly_avg":1.97,"monthly_win_rate":77.8,"monthly_count":18,"daily_avg":0.09,"daily_win_rate":57.3,"daily_count":375,"avg_vol":34.86,"best":17.14,"worst":-9.13},{"quarter":"Q3 (Jul\u2013Sep)","q_num":3,"monthly_avg":0.88,"monthly_win_rate":66.7,"monthly_count":18,"daily_avg":0.04,"daily_win_rate":55.4,"daily_count":383,"avg_vol":31.0,"best":9.41,"worst":-9.09},{"quarter":"Q4 (Oct\u2013Dec)","q_num":4,"monthly_avg":2.12,"monthly_win_rate":61.1,"monthly_count":18,"daily_avg":0.12,"daily_win_rate":55.8,"daily_count":382,"avg_vol":30.62,"best":9.65,"worst":-6.44}],"yearly_summary":{"avg":11.19,"median":15.7,"win_rate":71.4,"best":26.55,"worst":-19.71,"count":7,"years":[{"year":2020,"return":15.56,"true_range":160.2,"green":true},{"year":2021,"return":26.55,"true_range":114.18,"green":true},{"year":2022,"return":-19.71,"true_range":131.87,"green":false},{"year":2023,"return":23.66,"true_range":99.72,"green":true},{"year":2024,"return":24.13,"true_range":142.64,"green":true},{"year":2025,"return":15.7,"true_range":209.86,"green":true},{"year":2026,"return":-7.53,"true_range":64.73,"green":false}]},"santa":{"nov_avg":4.52,"nov_win":66.7,"dec_avg":0.11,"dec_win":66.7,"novdec_avg":2.32,"novdec_win":66.7,"rest_avg":0.7,"rest_win":63.5,"count":6,"nov_daily_avg":0.25,"nov_daily_win":64.8,"dec_daily_avg":0.02,"dec_daily_win":50.8},"streaks":{"weekly":{"max_green":9,"max_red":7,"after_2green_avg":0.09,"after_2green_winrate":56.2,"after_2red_avg":0.47,"after_2red_winrate":51.7,"p_green_after_green":59.6,"p_green_after_red":55.5,"after_3green_avg":0.12,"after_3green_winrate":57.1,"after_3red_avg":0.88,"after_3red_winrate":57.1},"monthly":{"max_green":7,"max_red":3,"p_green_after_green":64.6},"yearly":{"max_green":3,"max_red":1},"daily":{"max_green":10,"max_red":7,"after_2green_avg":0.04,"after_2green_winrate":54.6,"after_2red_avg":0.17,"after_2red_winrate":55.4,"p_green_after_green":53.7,"p_green_after_red":55.9}},"recovery":{"dd5":{"count":5,"avg_weeks":30.8,"median_weeks":16.0,"max_weeks":101},"dd10":{"count":3,"avg_weeks":43.7,"median_weeks":25.0,"max_weeks":94},"dd15":{"count":3,"avg_weeks":40.0,"median_weeks":23.0,"max_weeks":85},"dd20":{"count":2,"avg_weeks":51.5,"median_weeks":51.5,"max_weeks":80}},"vol_edge":{"weekly_buckets":[{"bucket":"Very Low (0\u201320%)","threshold_low":3.34,"threshold_high":8.19,"self_avg":0.27,"self_winrate":65.2,"after_avg":0.4,"after_winrate":69.7,"count":66},{"bucket":"Low (20\u201340%)","threshold_low":8.2,"threshold_high":11.53,"self_avg":0.48,"self_winrate":66.2,"after_avg":-0.13,"after_winrate":50.8,"count":65},{"bucket":"Medium (40\u201360%)","threshold_low":11.59,"threshold_high":14.6,"self_avg":0.67,"self_winrate":66.2,"after_avg":-0.01,"after_winrate":53.8,"count":65},{"bucket":"High (60\u201380%)","threshold_low":14.71,"threshold_high":19.86,"self_avg":0.23,"self_winrate":53.8,"after_avg":0.45,"after_winrate":56.9,"count":65},{"bucket":"Very High (80\u2013100%)","threshold_low":19.91,"threshold_high":66.82,"self_avg":-0.28,"self_winrate":36.9,"after_avg":0.68,"after_winrate":57.8,"count":65}],"daily_buckets":[{"bucket":"Very Low (0\u201320%)","threshold_low":0.77,"threshold_high":3.03,"self_avg":0.14,"self_winrate":63.0,"after_avg":0.06,"after_winrate":58.2,"count":316},{"bucket":"Low (20\u201340%)","threshold_low":3.03,"threshold_high":4.15,"self_avg":0.22,"self_winrate":61.9,"after_avg":0.02,"after_winrate":55.4,"count":312},{"bucket":"Medium (40\u201360%)","threshold_low":4.15,"threshold_high":5.47,"self_avg":0.2,"self_winrate":57.6,"after_avg":-0.05,"after_winrate":48.4,"count":314},{"bucket":"High (60\u201380%)","threshold_low":5.49,"threshold_high":7.72,"self_avg":0.03,"self_winrate":50.8,"after_avg":0.08,"after_winrate":55.3,"count":311},{"bucket":"Very High (80\u2013100%)","threshold_low":7.72,"threshold_high":55.57,"self_avg":-0.33,"self_winrate":40.1,"after_avg":0.15,"after_winrate":55.9,"count":314}],"after_consec_hivol_avg":0.37,"after_consec_hivol_winrate":64.3,"weekly_avg_tr":14.64,"daily_avg_tr":5.67,"hi_vol_threshold":19.86,"lo_vol_threshold":8.19,"hi_vol_self_avg":-0.29,"hi_vol_self_winrate":36.4,"lo_vol_self_avg":0.27,"risk_adj_all":0.0188},"week_of_month":[{"week":"Week 1","avg_return":0.23,"median_return":0.47,"win_rate":62.7,"count":75,"best":6.04,"worst":-8.1},{"week":"Week 2","avg_return":0.57,"median_return":0.44,"win_rate":58.7,"count":75,"best":9.15,"worst":-6.02},{"week":"Week 3","avg_return":-0.3,"median_return":-0.26,"win_rate":42.7,"count":75,"best":5.61,"worst":-5.68},{"week":"Week 4","avg_return":0.68,"median_return":0.93,"win_rate":66.7,"count":75,"best":11.06,"worst":-8.32},{"week":"Week 5","avg_return":0.07,"median_return":0.18,"win_rate":57.7,"count":26,"best":4.1,"worst":-4.56}],"day_of_week":[{"day":"Monday","avg_return":0.1248,"median_return":0.2088,"win_rate":62.9,"avg_range":5.42,"count":291,"best":6.72,"worst":-10.94,"after_green_avg":0.12,"after_red_avg":0.13},{"day":"Tuesday","avg_return":0.0639,"median_return":-0.0206,"win_rate":49.1,"avg_range":5.42,"count":324,"best":9.06,"worst":-4.35,"after_green_avg":-0.04,"after_red_avg":0.24},{"day":"Wednesday","avg_return":0.09,"median_return":0.1096,"win_rate":57.1,"avg_range":5.76,"count":322,"best":10.5,"worst":-5.06,"after_green_avg":0.07,"after_red_avg":0.11},{"day":"Thursday","avg_return":-0.0392,"median_return":0.0378,"win_rate":52.4,"avg_range":5.94,"count":315,"best":5.84,"worst":-9.57,"after_green_avg":-0.09,"after_red_avg":0.02},{"day":"Friday","avg_return":0.0234,"median_return":0.069,"win_rate":52.7,"avg_range":5.81,"count":315,"best":8.55,"worst":-5.85,"after_green_avg":-0.02,"after_red_avg":0.07}],"holidays":{"thanksgiving_week":{"avg":0.38,"median":1.32,"win_rate":66.7,"count":6,"best":1.95,"worst":-2.53},"thanksgiving_daily":{"avg":0.29,"median":0.31,"win_rate":68.0,"count":25,"best":1.61,"worst":-2.23},"christmas_week":{"avg":1.12,"median":0.82,"win_rate":83.3,"count":6,"best":3.55,"worst":-0.15},"christmas_daily":{"avg":0.37,"median":0.41,"win_rate":75.0,"count":24,"best":1.78,"worst":-1.43},"new_year_week":{"avg":0.26,"median":0.26,"win_rate":66.7,"count":3,"best":0.61,"worst":-0.09},"new_year_daily":{"avg":-0.13,"median":-0.14,"win_rate":44.4,"count":18,"best":1.25,"worst":-1.92},"july4_week":{"avg":0.76,"median":1.41,"win_rate":66.7,"count":6,"best":3.59,"worst":-2.51},"july4_daily":{"avg":0.44,"median":0.5,"win_rate":90.0,"count":10,"best":0.79,"worst":-0.15},"memorial_week":{"avg":1.07,"median":0.57,"win_rate":71.4,"count":7,"best":5.71,"worst":-0.55},"memorial_daily":{"avg":0.46,"median":0.19,"win_rate":66.7,"count":24,"best":2.45,"worst":-0.7},"labor_week":{"avg":-0.71,"median":-0.88,"win_rate":50.0,"count":6,"best":2.02,"worst":-3.59},"labor_daily":{"avg":-0.25,"median":0.05,"win_rate":53.3,"count":15,"best":1.45,"worst":-3.44},"mlk_daily":{"avg":0.01,"median":0.0,"win_rate":50.0,"count":28,"best":1.86,"worst":-2.04},"presidents_daily":{"avg":-0.25,"median":-0.21,"win_rate":42.9,"count":28,"best":1.61,"worst":-2.14},"short_week":{"avg":0.43,"median":0.57,"win_rate":60.7,"count":61,"best":7.9,"worst":-4.73},"after_short_week":{"avg":0.33,"median":0.7,"win_rate":65.6,"count":61,"best":5.66,"worst":-8.32},"tax_loss_sell":{"avg":-0.02,"median":0.02,"win_rate":51.5,"count":68,"best":1.8,"worst":-2.98},"tax_loss_buy":{"avg":0.1,"median":0.14,"win_rate":51.2,"count":43,"best":2.29,"worst":-1.92},"january_effect":{"avg":0.11,"median":0.14,"win_rate":51.4,"count":35,"best":2.29,"worst":-1.92},"sell_in_may":{"avg":0.07,"median":0.12,"win_rate":56.0,"count":766,"best":3.3,"worst":-5.76},"buy_in_nov":{"avg":0.04,"median":0.07,"win_rate":53.4,"count":801,"best":10.5,"worst":-10.94},"triple_witching":{"avg":-0.9,"median":-0.82,"win_rate":16.0,"count":25,"best":0.86,"worst":-4.87},"q4_earnings_oct":{"avg":0.04,"median":0.07,"win_rate":52.8,"count":72,"best":2.57,"worst":-3.42},"q4_earnings_nov":{"avg":0.36,"median":0.23,"win_rate":68.8,"count":64,"best":5.5,"worst":-2.51}},"daily_seasonality":[{"month":"Jan","avg_return":0.04,"win_rate":53.9,"count":141,"best":2.48,"worst":-2.44},{"month":"Feb","avg_return":-0.05,"win_rate":51.5,"count":134,"best":2.21,"worst":-4.49},{"month":"Mar","avg_return":-0.07,"win_rate":47.4,"count":152,"best":9.06,"worst":-10.94},{"month":"Apr","avg_return":0.05,"win_rate":54.0,"count":124,"best":10.5,"worst":-5.85},{"month":"May","avg_return":0.14,"win_rate":58.7,"count":126,"best":3.3,"worst":-4.03},{"month":"Jun","avg_return":0.07,"win_rate":59.2,"count":125,"best":3.18,"worst":-5.76},{"month":"Jul","avg_return":0.19,"win_rate":60.6,"count":127,"best":2.7,"worst":-2.27},{"month":"Aug","avg_return":0.07,"win_rate":56.1,"count":132,"best":2.31,"worst":-3.38},{"month":"Sep","avg_return":-0.15,"win_rate":49.2,"count":124,"best":1.97,"worst":-4.35},{"month":"Oct","avg_return":0.09,"win_rate":52.3,"count":132,"best":3.1,"worst":-3.42},{"month":"Nov","avg_return":0.25,"win_rate":64.8,"count":122,"best":5.5,"worst":-2.51},{"month":"Dec","avg_return":0.02,"win_rate":50.8,"count":128,"best":2.07,"worst":-2.98}],"daily_vol_edge":{"hi_vol_threshold":7.72,"lo_vol_threshold":3.03,"after_hivol_avg":0.15,"after_hivol_winrate":55.9,"after_lovol_avg":0.06,"after_lovol_winrate":58.2,"hi_vol_self_avg":-0.33,"hi_vol_self_winrate":40.1},"releases":{"cpi":{"before":{"avg":0.63,"median":0.83,"win_rate":65.3,"count":75,"best":7.23,"worst":-9.07},"during":{"avg":0.13,"median":-0.26,"win_rate":48.0,"count":75,"best":11.07,"worst":-9.46},"after":{"avg":-0.35,"median":-0.01,"win_rate":49.3,"count":75,"best":5.82,"worst":-15.05}},"nfp":{"before":{"avg":0.57,"median":0.15,"win_rate":60.0,"count":70,"best":6.0,"worst":-3.97},"during":{"avg":0.12,"median":0.37,"win_rate":64.3,"count":70,"best":5.36,"worst":-11.5},"after":{"avg":0.51,"median":0.41,"win_rate":64.3,"count":70,"best":8.28,"worst":-12.35}}},"meta":{"label":"Since 2020","weekly_count":326,"monthly_count":75,"daily_count":1567}},"current_year":{"seasonality":[{"month":"Jan","avg_return":0.91,"median_return":0.91,"win_rate":100.0,"avg_vol":21.27,"count":1,"best":0.91,"worst":0.91,"daily_avg":0.08,"daily_win_rate":55.0,"daily_count":20},{"month":"Feb","avg_return":-0.52,"median_return":-0.52,"win_rate":0.0,"avg_vol":21.36,"count":1,"best":-0.52,"worst":-0.52,"daily_avg":-0.04,"daily_win_rate":47.4,"daily_count":19},{"month":"Mar","avg_return":-6.57,"median_return":-6.57,"win_rate":0.0,"avg_vol":55.51,"count":1,"best":-6.57,"worst":-6.57,"daily_avg":-0.39,"daily_win_rate":35.0,"daily_count":20},{"month":"Apr","avg_return":0,"median_return":0,"win_rate":0,"avg_vol":0,"count":0,"best":0,"worst":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0},{"month":"May","avg_return":0,"median_return":0,"win_rate":0,"avg_vol":0,"count":0,"best":0,"worst":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0},{"month":"Jun","avg_return":0,"median_return":0,"win_rate":0,"avg_vol":0,"count":0,"best":0,"worst":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0},{"month":"Jul","avg_return":0,"median_return":0,"win_rate":0,"avg_vol":0,"count":0,"best":0,"worst":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0},{"month":"Aug","avg_return":0,"median_return":0,"win_rate":0,"avg_vol":0,"count":0,"best":0,"worst":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0},{"month":"Sep","avg_return":0,"median_return":0,"win_rate":0,"avg_vol":0,"count":0,"best":0,"worst":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0},{"month":"Oct","avg_return":0,"median_return":0,"win_rate":0,"avg_vol":0,"count":0,"best":0,"worst":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0},{"month":"Nov","avg_return":0,"median_return":0,"win_rate":0,"avg_vol":0,"count":0,"best":0,"worst":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0},{"month":"Dec","avg_return":0,"median_return":0,"win_rate":0,"avg_vol":0,"count":0,"best":0,"worst":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0}],"quarterly":[{"quarter":"Q1 (Jan\u2013Mar)","q_num":1,"monthly_avg":-2.06,"monthly_win_rate":33.3,"monthly_count":3,"daily_avg":-0.12,"daily_win_rate":45.8,"daily_count":59,"avg_vol":32.71,"best":0.91,"worst":-6.57},{"quarter":"Q2 (Apr\u2013Jun)","q_num":2,"monthly_avg":0,"monthly_win_rate":0,"monthly_count":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0,"avg_vol":0,"best":0,"worst":0},{"quarter":"Q3 (Jul\u2013Sep)","q_num":3,"monthly_avg":0,"monthly_win_rate":0,"monthly_count":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0,"avg_vol":0,"best":0,"worst":0},{"quarter":"Q4 (Oct\u2013Dec)","q_num":4,"monthly_avg":0,"monthly_win_rate":0,"monthly_count":0,"daily_avg":0,"daily_win_rate":0,"daily_count":0,"avg_vol":0,"best":0,"worst":0}],"yearly_summary":{"avg":-7.53,"median":-7.53,"win_rate":0.0,"best":-7.53,"worst":-7.53,"count":1,"years":[{"year":2026,"return":-7.53,"green":false}]},"santa":{"nov_avg":0,"nov_win":0,"dec_avg":0,"dec_win":0,"novdec_avg":0,"novdec_win":0,"rest_avg":-2.06,"rest_win":33.3,"count":0,"nov_daily_avg":0,"nov_daily_win":0,"dec_daily_avg":0,"dec_daily_win":0},"streaks":{"weekly":{"max_green":5,"max_red":5,"after_2green_avg":0.1,"after_2green_winrate":75.0,"after_2red_avg":-2.41,"after_2red_winrate":0.0,"after_3green_avg":-0.25,"after_3green_winrate":66.7,"after_3red_avg":-3.3,"after_3red_winrate":0.0,"p_green_after_green":66.7,"p_green_after_red":33.3},"monthly":{"max_green":1,"max_red":2,"p_green_after_green":0.0},"yearly":{"max_green":0,"max_red":1},"daily":{"max_green":5,"max_red":4,"after_2green_avg":-0.08,"after_2green_winrate":41.7,"after_2red_avg":0.04,"after_2red_winrate":62.5,"after_3green_avg":0.06,"after_3green_winrate":40.0,"after_3red_avg":0.66,"after_3red_winrate":83.3,"p_green_after_green":44.4,"p_green_after_red":45.2}},"recovery":{"dd5":{"count":0,"avg_weeks":0,"median_weeks":0,"max_weeks":0},"dd10":{"count":0,"avg_weeks":0,"median_weeks":0,"max_weeks":0},"dd15":{"count":0,"avg_weeks":0,"median_weeks":0,"max_weeks":0},"dd20":{"count":0,"avg_weeks":0,"median_weeks":0,"max_weeks":0}},"vol_edge":{"weekly_buckets":[{"bucket":"Very Low (0\u201320%)","threshold_low":8.93,"threshold_high":10.05,"self_avg":0.2,"self_winrate":66.7,"after_avg":0.79,"after_winrate":100.0,"count":3},{"bucket":"Low (20\u201340%)","threshold_low":13.01,"threshold_high":13.68,"self_avg":-0.03,"self_winrate":50.0,"after_avg":-0.39,"after_winrate":50.0,"count":2},{"bucket":"Medium (40\u201360%)","threshold_low":14.28,"threshold_high":18.96,"self_avg":0.53,"self_winrate":66.7,"after_avg":-0.23,"after_winrate":33.3,"count":3},{"bucket":"High (60\u201380%)","threshold_low":19.62,"threshold_high":21.17,"self_avg":-0.48,"self_winrate":50.0,"after_avg":0.13,"after_winrate":50.0,"count":2},{"bucket":"Very High (80\u2013100%)","threshold_low":22.0,"threshold_high":29.72,"self_avg":-2.41,"self_winrate":0.0,"after_avg":-3.3,"after_winrate":0.0,"count":3}],"daily_buckets":[{"bucket":"Very Low (0\u201320%)","threshold_low":2.96,"threshold_high":4.63,"self_avg":0.29,"self_winrate":66.7,"after_avg":-0.02,"after_winrate":50.0,"count":12},{"bucket":"Low (20\u201340%)","threshold_low":4.64,"threshold_high":6.35,"self_avg":-0.17,"self_winrate":41.7,"after_avg":-0.11,"after_winrate":41.7,"count":12},{"bucket":"Medium (40\u201360%)","threshold_low":6.65,"threshold_high":7.96,"self_avg":0.01,"self_winrate":45.5,"after_avg":-0.42,"after_winrate":36.4,"count":11},{"bucket":"High (60\u201380%)","threshold_low":8.2,"threshold_high":9.69,"self_avg":-0.39,"self_winrate":41.7,"after_avg":-0.01,"after_winrate":45.5,"count":12},{"bucket":"Very High (80\u2013100%)","threshold_low":9.92,"threshold_high":17.53,"self_avg":-0.34,"self_winrate":33.3,"after_avg":-0.08,"after_winrate":50.0,"count":12}],"weekly_avg_tr":17.3,"daily_avg_tr":7.54,"hi_vol_threshold":21.67,"lo_vol_threshold":11.23,"hi_vol_self_avg":-2.41,"hi_vol_self_winrate":0.0,"lo_vol_self_avg":0.2,"risk_adj_all":-0.0269,"after_consec_hivol_avg":-3.64,"after_consec_hivol_winrate":0.0},"week_of_month":[{"week":"Week 1","avg_return":-0.47,"median_return":-0.64,"win_rate":33.3,"count":3,"best":0.15,"worst":-0.93},{"week":"Week 2","avg_return":-0.21,"median_return":-0.62,"win_rate":33.3,"count":3,"best":1.1,"worst":-1.11},{"week":"Week 3","avg_return":-0.48,"median_return":0.14,"win_rate":66.7,"count":3,"best":1.37,"worst":-2.96},{"week":"Week 4","avg_return":-0.92,"median_return":-0.27,"win_rate":33.3,"count":3,"best":1.14,"worst":-3.64},{"week":"Week 5","avg_return":0.21,"median_return":0.21,"win_rate":100.0,"count":1,"best":0.21,"worst":0.21}],"day_of_week":[{"day":"Monday","avg_return":0.429,"median_return":0.5025,"win_rate":90.0,"avg_range":7.91,"count":10,"best":1.05,"worst":-1.02,"after_green_avg":0.16,"after_red_avg":0.7},{"day":"Tuesday","avg_return":-0.2149,"median_return":-0.1803,"win_rate":41.7,"avg_range":7.43,"count":12,"best":0.73,"worst":-2.04,"after_green_avg":-0.13,"after_red_avg":-0.65},{"day":"Wednesday","avg_return":0.076,"median_return":-0.0166,"win_rate":41.7,"avg_range":6.81,"count":12,"best":1.15,"worst":-1.4,"after_green_avg":-0.08,"after_red_avg":0.18},{"day":"Thursday","avg_return":-0.5946,"median_return":-0.4096,"win_rate":16.7,"avg_range":7.81,"count":12,"best":0.52,"worst":-1.79,"after_green_avg":-0.53,"after_red_avg":-0.64},{"day":"Friday","avg_return":-0.1964,"median_return":-0.0838,"win_rate":46.2,"avg_range":7.76,"count":13,"best":1.92,"worst":-1.71,"after_green_avg":-0.02,"after_red_avg":-0.27}],"holidays":{"thanksgiving_week":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"thanksgiving_daily":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"christmas_week":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"christmas_daily":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"new_year_week":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"new_year_daily":{"avg":0.42,"median":0.42,"win_rate":100.0,"count":2,"best":0.67,"worst":0.18},"july4_week":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"july4_daily":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"memorial_week":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"memorial_daily":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"labor_week":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"labor_daily":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"mlk_daily":{"avg":-0.17,"median":0.09,"win_rate":50.0,"count":4,"best":1.15,"worst":-2.04},"presidents_daily":{"avg":0.28,"median":0.33,"win_rate":75.0,"count":4,"best":0.72,"worst":-0.26},"short_week":{"avg":0.62,"median":1.14,"win_rate":66.7,"count":3,"best":1.37,"worst":-0.64},"after_short_week":{"avg":0.35,"median":0.21,"win_rate":66.7,"count":3,"best":1.1,"worst":-0.27},"tax_loss_sell":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"tax_loss_buy":{"avg":0.3,"median":0.39,"win_rate":66.7,"count":6,"best":0.67,"worst":-0.32},"january_effect":{"avg":0.22,"median":0.18,"win_rate":60.0,"count":5,"best":0.67,"worst":-0.32},"sell_in_may":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"buy_in_nov":{"avg":-0.12,"median":-0.02,"win_rate":45.8,"count":59,"best":1.92,"worst":-2.04},"triple_witching":{"avg":-1.7,"median":-1.7,"win_rate":0.0,"count":1,"best":-1.7,"worst":-1.7},"q4_earnings_oct":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0},"q4_earnings_nov":{"avg":0,"median":0,"win_rate":0,"count":0,"best":0,"worst":0}},"daily_seasonality":[{"month":"Jan","avg_return":0.08,"win_rate":55.0,"count":20,"best":1.15,"worst":-2.04},{"month":"Feb","avg_return":-0.04,"win_rate":47.4,"count":19,"best":1.92,"worst":-1.54},{"month":"Mar","avg_return":-0.39,"win_rate":35.0,"count":20,"best":1.05,"worst":-1.79},{"month":"Apr","avg_return":0,"win_rate":0,"count":0,"best":0,"worst":0},{"month":"May","avg_return":0,"win_rate":0,"count":0,"best":0,"worst":0},{"month":"Jun","avg_return":0,"win_rate":0,"count":0,"best":0,"worst":0},{"month":"Jul","avg_return":0,"win_rate":0,"count":0,"best":0,"worst":0},{"month":"Aug","avg_return":0,"win_rate":0,"count":0,"best":0,"worst":0},{"month":"Sep","avg_return":0,"win_rate":0,"count":0,"best":0,"worst":0},{"month":"Oct","avg_return":0,"win_rate":0,"count":0,"best":0,"worst":0},{"month":"Nov","avg_return":0,"win_rate":0,"count":0,"best":0,"worst":0},{"month":"Dec","avg_return":0,"win_rate":0,"count":0,"best":0,"worst":0}],"daily_vol_edge":{"hi_vol_threshold":9.78,"lo_vol_threshold":4.64,"after_hivol_avg":-0.08,"after_hivol_winrate":50.0,"after_lovol_avg":-0.02,"after_lovol_winrate":50.0,"hi_vol_self_avg":-0.34,"hi_vol_self_winrate":33.3},"releases":{"cpi":{"before":{"avg":-0.19,"median":-0.2,"win_rate":33.3,"count":3,"best":1.6,"worst":-1.98},"during":{"avg":-1.04,"median":-1.28,"win_rate":0.0,"count":3,"best":-0.35,"worst":-1.5},"after":{"avg":-0.61,"median":0.09,"win_rate":66.7,"count":3,"best":0.15,"worst":-2.07}},"nfp":{"before":{"avg":-0.27,"median":-0.86,"win_rate":33.3,"count":3,"best":1.07,"worst":-1.02},"during":{"avg":0.16,"median":0.38,"win_rate":66.7,"count":3,"best":0.58,"worst":-0.46},"after":{"avg":-0.5,"median":-0.84,"win_rate":33.3,"count":3,"best":0.28,"worst":-0.94}}},"meta":{"label":"2026 YTD","weekly_count":13,"monthly_count":3,"daily_count":59}},"political":{"election":{"avg":5.29,"median":11.56,"win_rate":75.0,"count":8,"best":23.3,"worst":-38.28,"best_year":2024,"worst_year":2008,"years":[{"year":1996,"ret":20.1},{"year":2000,"ret":-10.68},{"year":2004,"ret":8.62},{"year":2008,"ret":-38.28},{"year":2012,"ret":13.47},{"year":2016,"ret":9.64},{"year":2020,"ret":16.16},{"year":2024,"ret":23.3}]},"midterm":{"avg":1.76,"median":4.54,"win_rate":50.0,"count":8,"best":27.04,"worst":-22.81,"best_year":1998,"worst_year":2002,"years":[{"year":1994,"ret":-2.21},{"year":1998,"ret":27.04},{"year":2002,"ret":-22.81},{"year":2006,"ret":13.74},{"year":2010,"ret":12.84},{"year":2014,"ret":11.29},{"year":2018,"ret":-6.35},{"year":2022,"ret":-19.48}]},"year1":{"avg":17.19,"median":21.44,"win_rate":87.5,"count":8,"best":31.44,"worst":-12.87,"best_year":1997,"worst_year":2001,"years":[{"year":1997,"ret":31.44},{"year":2001,"ret":-12.87},{"year":2005,"ret":3.01},{"year":2009,"ret":23.49},{"year":2013,"ret":29.69},{"year":2017,"ret":19.38},{"year":2021,"ret":27.04},{"year":2025,"ret":16.35}]},"year3":{"avg":14.36,"median":19.11,"win_rate":71.4,"count":7,"best":28.79,"worst":-0.81,"best_year":2019,"worst_year":2015,"years":[{"year":1999,"ret":19.11},{"year":2003,"ret":26.12},{"year":2007,"ret":3.24},{"year":2011,"ret":-0.2},{"year":2015,"ret":-0.81},{"year":2019,"ret":28.79},{"year":2023,"ret":24.29}]},"dem":{"avg":14.44,"median":19.11,"win_rate":73.7,"count":19,"best":34.95,"worst":-19.48},"rep":{"avg":4.24,"median":8.62,"win_rate":69.2,"count":13,"best":28.79,"worst":-38.28},"election_q4":{"avg":0.12,"win_rate":62.5,"count":8},"midterm_q4":{"avg":5.16,"win_rate":75.0,"count":8},"year1_q4":{"avg":6.03,"win_rate":100.0,"count":8},"year3_q4":{"avg":8.31,"win_rate":85.7,"count":7}},"current_year_num":2026};
const RR_DATA = {"2":{"count":237,"avg_drop":3.0,"avg_days_drop":7,"avg_bounce_pct":5.9,"med_bounce_pct":3.8,"avg_retrace_pct":204.5,"med_retrace_pct":113.3,"avg_days_bounce":19,"buckets":[{"label":"<38.2%","count":36},{"label":"38.2\u201350%","count":9},{"label":"50\u201361.8%","count":17},{"label":"61.8\u201370%","count":6},{"label":"70\u2013100%","count":41},{"label":">100% (full)","count":128}],"fwd":{"1mo":{"avg":1.6,"win":69},"2mo":{"avg":2.9,"win":71},"3mo":{"avg":3.6,"win":71}},"events":[{"peak_date":"2026-03-10","trough_date":"2026-03-13","bounce_date":"2026-03-17","drop_pct":2.2,"days_drop":3,"bounce_pct":1.3,"retrace_pct":57.1,"days_bounce":2},{"peak_date":"2026-02-10","trough_date":"2026-03-06","bounce_date":"2026-03-09","drop_pct":2.9,"days_drop":17,"bounce_pct":0.9,"retrace_pct":29.8,"days_bounce":1},{"peak_date":"2026-01-28","trough_date":"2026-02-05","bounce_date":"2026-02-09","drop_pct":2.6,"days_drop":6,"bounce_pct":2.4,"retrace_pct":91.7,"days_bounce":2,"1mo":0.1},{"peak_date":"2026-01-09","trough_date":"2026-01-20","bounce_date":"2026-01-27","drop_pct":2.4,"days_drop":6,"bounce_pct":2.6,"retrace_pct":108.6,"days_bounce":5,"1mo":1.0,"2mo":-4.3},{"peak_date":"2025-09-22","trough_date":"2025-10-10","bounce_date":"2026-01-06","drop_pct":2.1,"days_drop":14,"bounce_pct":5.9,"retrace_pct":280.7,"days_bounce":59,"1mo":4.4,"2mo":5.3,"3mo":6.5},{"peak_date":"2025-05-16","trough_date":"2025-05-23","bounce_date":"2025-08-14","drop_pct":2.5,"days_drop":5,"bounce_pct":11.4,"retrace_pct":436.3,"days_bounce":56,"1mo":4.8,"2mo":10.0,"3mo":10.9},{"peak_date":"2025-04-09","trough_date":"2025-04-10","bounce_date":"2025-04-14","drop_pct":4.4,"days_drop":1,"bounce_pct":2.8,"retrace_pct":60.5,"days_bounce":2,"1mo":11.1,"2mo":14.6,"3mo":19.1},{"peak_date":"2025-03-24","trough_date":"2025-03-28","bounce_date":"2025-04-02","drop_pct":3.2,"days_drop":4,"bounce_pct":1.6,"retrace_pct":48.1,"days_bounce":3,"1mo":-0.2,"2mo":6.2,"3mo":11.2},{"peak_date":"2025-02-28","trough_date":"2025-03-04","bounce_date":"2025-03-05","drop_pct":2.9,"days_drop":2,"bounce_pct":1.1,"retrace_pct":35.8,"days_bounce":1,"1mo":-2.1,"2mo":-1.8,"3mo":3.3},{"peak_date":"2024-10-21","trough_date":"2024-10-31","bounce_date":"2025-01-23","drop_pct":2.6,"days_drop":8,"bounce_pct":7.2,"retrace_pct":274.2,"days_bounce":55,"1mo":6.2,"2mo":2.8,"3mo":5.8},{"peak_date":"2024-08-01","trough_date":"2024-08-05","bounce_date":"2024-10-18","drop_pct":4.7,"days_drop":2,"bounce_pct":13.0,"retrace_pct":262.2,"days_bounce":53,"1mo":6.5,"2mo":9.7,"3mo":10.4},{"peak_date":"2024-07-17","trough_date":"2024-07-24","bounce_date":"2024-07-31","drop_pct":2.8,"days_drop":5,"bounce_pct":1.8,"retrace_pct":61.0,"days_bounce":5,"1mo":2.8,"2mo":5.3,"3mo":7.8}]},"5":{"count":97,"avg_drop":6.0,"avg_days_drop":16,"avg_bounce_pct":7.7,"med_bounce_pct":6.0,"avg_retrace_pct":126.1,"med_retrace_pct":96.0,"avg_days_bounce":22,"buckets":[{"label":"<38.2%","count":22},{"label":"38.2\u201350%","count":8},{"label":"50\u201361.8%","count":8},{"label":"61.8\u201370%","count":1},{"label":"70\u2013100%","count":11},{"label":">100% (full)","count":47}],"fwd":{"1mo":{"avg":2.6,"win":76},"2mo":{"avg":4.0,"win":68},"3mo":{"avg":4.5,"win":73}},"events":[{"peak_date":"2026-02-06","trough_date":"2026-03-20","bounce_date":"2026-03-25","drop_pct":6.1,"days_drop":29,"bounce_pct":1.3,"retrace_pct":19.6,"days_bounce":3},{"peak_date":"2024-07-31","trough_date":"2024-08-05","bounce_date":"2024-10-18","drop_pct":6.1,"days_drop":3,"bounce_pct":13.0,"retrace_pct":201.0,"days_bounce":53,"1mo":6.5,"2mo":9.7,"3mo":10.4},{"peak_date":"2024-03-21","trough_date":"2024-04-19","bounce_date":"2024-07-16","drop_pct":5.2,"days_drop":20,"bounce_pct":14.1,"retrace_pct":257.8,"days_bounce":59,"1mo":7.0,"2mo":10.5,"3mo":12.0},{"peak_date":"2023-06-12","trough_date":"2023-10-27","bounce_date":"2024-01-25","drop_pct":5.3,"days_drop":96,"bounce_pct":18.8,"retrace_pct":334.6,"days_bounce":60,"1mo":10.8,"2mo":16.1,"3mo":19.5},{"peak_date":"2023-02-02","trough_date":"2023-03-01","bounce_date":"2023-03-06","drop_pct":5.3,"days_drop":18,"bounce_pct":2.5,"retrace_pct":44.1,"days_bounce":3,"1mo":2.3,"2mo":5.3,"3mo":5.9},{"peak_date":"2022-12-01","trough_date":"2022-12-16","bounce_date":"2022-12-21","drop_pct":5.9,"days_drop":11,"bounce_pct":0.8,"retrace_pct":12.3,"days_bounce":3,"1mo":1.4,"2mo":6.3,"3mo":4.1},{"peak_date":"2022-10-04","trough_date":"2022-10-11","bounce_date":"2022-11-30","drop_pct":5.4,"days_drop":5,"bounce_pct":14.0,"retrace_pct":246.9,"days_bounce":35,"1mo":4.6,"2mo":9.9,"3mo":10.6},{"peak_date":"2022-09-20","trough_date":"2022-09-26","bounce_date":"2022-09-28","drop_pct":5.1,"days_drop":4,"bounce_pct":1.7,"retrace_pct":31.4,"days_bounce":2,"1mo":5.7,"2mo":10.5,"3mo":5.1},{"peak_date":"2022-09-09","trough_date":"2022-09-16","bounce_date":"2022-09-19","drop_pct":5.2,"days_drop":5,"bounce_pct":0.8,"retrace_pct":14.2,"days_bounce":1,"1mo":-4.9,"2mo":3.4,"3mo":1.1},{"peak_date":"2022-05-05","trough_date":"2022-05-11","bounce_date":"2022-06-02","drop_pct":5.1,"days_drop":4,"bounce_pct":6.3,"retrace_pct":117.0,"days_bounce":15,"1mo":-0.8,"2mo":-3.5,"3mo":6.9},{"peak_date":"2022-04-20","trough_date":"2022-04-26","bounce_date":"2022-05-04","drop_pct":6.4,"days_drop":4,"bounce_pct":3.1,"retrace_pct":45.3,"days_bounce":6,"1mo":-4.5,"2mo":-6.6,"3mo":-3.6},{"peak_date":"2022-03-29","trough_date":"2022-04-12","bounce_date":"2022-04-19","drop_pct":5.0,"days_drop":10,"bounce_pct":1.5,"retrace_pct":29.0,"days_bounce":4,"1mo":-10.5,"2mo":-14.4,"3mo":-13.8}]},"7":{"count":53,"avg_drop":8.2,"avg_days_drop":16,"avg_bounce_pct":7.2,"med_bounce_pct":5.6,"avg_retrace_pct":78.4,"med_retrace_pct":71.2,"avg_days_bounce":18,"buckets":[{"label":"<38.2%","count":16},{"label":"38.2\u201350%","count":5},{"label":"50\u201361.8%","count":3},{"label":"61.8\u201370%","count":2},{"label":"70\u2013100%","count":13},{"label":">100% (full)","count":14}],"fwd":{"1mo":{"avg":2.5,"win":72},"2mo":{"avg":3.5,"win":62},"3mo":{"avg":4.7,"win":72}},"events":[{"peak_date":"2025-02-28","trough_date":"2025-03-13","bounce_date":"2025-03-25","drop_pct":7.2,"days_drop":9,"bounce_pct":4.4,"retrace_pct":56.2,"days_bounce":8,"1mo":-3.2,"2mo":6.4,"3mo":9.5},{"peak_date":"2023-06-15","trough_date":"2023-10-27","bounce_date":"2024-01-25","drop_pct":7.2,"days_drop":93,"bounce_pct":18.8,"retrace_pct":242.3,"days_bounce":60,"1mo":10.8,"2mo":16.1,"3mo":19.5},{"peak_date":"2022-11-30","trough_date":"2022-12-28","bounce_date":"2023-02-02","drop_pct":7.6,"days_drop":19,"bounce_pct":10.7,"retrace_pct":129.3,"days_bounce":24,"1mo":6.4,"2mo":4.8,"3mo":7.2},{"peak_date":"2022-08-12","trough_date":"2022-08-31","bounce_date":"2022-09-01","drop_pct":7.5,"days_drop":13,"bounce_pct":0.3,"retrace_pct":3.9,"days_bounce":1,"1mo":-9.6,"2mo":-2.3,"3mo":3.2},{"peak_date":"2022-06-02","trough_date":"2022-06-13","bounce_date":"2022-06-15","drop_pct":10.2,"days_drop":7,"bounce_pct":1.1,"retrace_pct":9.9,"days_bounce":2,"1mo":0.8,"2mo":13.9,"3mo":4.8},{"peak_date":"2021-12-22","trough_date":"2022-01-25","bounce_date":"2022-02-09","drop_pct":7.1,"days_drop":22,"bounce_pct":5.3,"retrace_pct":69.4,"days_bounce":11,"1mo":-1.4,"2mo":4.2,"3mo":-4.2},{"peak_date":"2020-10-12","trough_date":"2020-10-28","bounce_date":"2021-01-25","drop_pct":7.3,"days_drop":12,"bounce_pct":17.7,"retrace_pct":224.0,"days_bounce":59,"1mo":11.3,"2mo":13.7,"3mo":13.3},{"peak_date":"2020-03-11","trough_date":"2020-03-12","bounce_date":"2020-03-13","drop_pct":9.6,"days_drop":1,"bounce_pct":8.5,"retrace_pct":80.8,"days_bounce":1,"1mo":11.1,"2mo":15.5,"3mo":21.2},{"peak_date":"2020-03-05","trough_date":"2020-03-09","bounce_date":"2020-03-10","drop_pct":9.3,"days_drop":2,"bounce_pct":5.2,"retrace_pct":50.3,"days_bounce":1,"1mo":-3.3,"2mo":4.9,"3mo":17.9},{"peak_date":"2020-02-04","trough_date":"2020-02-27","bounce_date":"2020-03-04","drop_pct":9.6,"days_drop":16,"bounce_pct":5.2,"retrace_pct":48.7,"days_bounce":4,"1mo":-14.8,"2mo":-4.0,"3mo":1.8},{"peak_date":"2018-09-20","trough_date":"2018-10-11","bounce_date":"2018-10-17","drop_pct":7.3,"days_drop":15,"bounce_pct":3.0,"retrace_pct":38.7,"days_bounce":4,"1mo":2.1,"2mo":-2.5,"3mo":-5.4},{"peak_date":"2018-03-09","trough_date":"2018-03-23","bounce_date":"2018-06-12","drop_pct":7.5,"days_drop":10,"bounce_pct":8.1,"retrace_pct":100.2,"days_bounce":55,"1mo":1.9,"2mo":5.9,"3mo":6.5}]},"10":{"count":18,"avg_drop":11.5,"avg_days_drop":21,"avg_bounce_pct":13.4,"med_bounce_pct":9.8,"avg_retrace_pct":102.2,"med_retrace_pct":78.8,"avg_days_bounce":26,"buckets":[{"label":"<38.2%","count":4},{"label":"38.2\u201350%","count":2},{"label":"50\u201361.8%","count":1},{"label":"61.8\u201370%","count":1},{"label":"70\u2013100%","count":2},{"label":">100% (full)","count":8}],"fwd":{"1mo":{"avg":5.7,"win":83},"2mo":{"avg":8.2,"win":78},"3mo":{"avg":9.7,"win":83}},"events":[{"peak_date":"2023-07-28","trough_date":"2023-10-27","bounce_date":"2024-01-25","drop_pct":10.1,"days_drop":64,"bounce_pct":18.8,"retrace_pct":167.3,"days_bounce":60,"1mo":10.8,"2mo":16.1,"3mo":19.5},{"peak_date":"2022-09-09","trough_date":"2022-09-26","bounce_date":"2022-09-28","drop_pct":10.4,"days_drop":11,"bounce_pct":1.7,"retrace_pct":14.7,"days_bounce":2,"1mo":5.7,"2mo":10.5,"3mo":5.1},{"peak_date":"2022-06-02","trough_date":"2022-06-13","bounce_date":"2022-06-15","drop_pct":10.2,"days_drop":7,"bounce_pct":1.1,"retrace_pct":9.9,"days_bounce":2,"1mo":0.8,"2mo":13.9,"3mo":4.8},{"peak_date":"2020-03-17","trough_date":"2020-03-23","bounce_date":"2020-06-08","drop_pct":11.8,"days_drop":4,"bounce_pct":45.0,"retrace_pct":335.8,"days_bounce":53,"1mo":25.2,"2mo":32.3,"3mo":39.3},{"peak_date":"2020-03-10","trough_date":"2020-03-12","bounce_date":"2020-03-13","drop_pct":14.0,"days_drop":2,"bounce_pct":8.5,"retrace_pct":52.6,"days_bounce":1,"1mo":11.1,"2mo":15.5,"3mo":21.2},{"peak_date":"2020-02-05","trough_date":"2020-02-27","bounce_date":"2020-03-04","drop_pct":10.6,"days_drop":15,"bounce_pct":5.2,"retrace_pct":43.4,"days_bounce":4,"1mo":-14.8,"2mo":-4.0,"3mo":1.8},{"peak_date":"2015-02-12","trough_date":"2015-08-25","bounce_date":"2015-11-03","drop_pct":10.4,"days_drop":134,"bounce_pct":12.7,"retrace_pct":109.6,"days_bounce":49,"1mo":3.0,"2mo":10.8,"3mo":11.6},{"peak_date":"2011-07-19","trough_date":"2011-08-08","bounce_date":"2011-08-31","drop_pct":15.4,"days_drop":14,"bounce_pct":8.9,"retrace_pct":48.7,"days_bounce":17,"1mo":7.2,"2mo":3.8,"3mo":11.8},{"peak_date":"2009-01-07","trough_date":"2009-01-20","bounce_date":"2009-01-28","drop_pct":11.1,"days_drop":8,"bounce_pct":8.5,"retrace_pct":67.5,"days_bounce":6,"1mo":-3.0,"2mo":-4.8,"3mo":5.6},{"peak_date":"2008-11-18","trough_date":"2008-11-20","bounce_date":"2009-01-06","drop_pct":13.4,"days_drop":2,"bounce_pct":23.9,"retrace_pct":154.9,"days_bounce":30,"1mo":15.4,"2mo":10.2,"3mo":2.7},{"peak_date":"2008-10-21","trough_date":"2008-10-27","bounce_date":"2008-11-04","drop_pct":12.4,"days_drop":4,"bounce_pct":19.6,"retrace_pct":138.2,"days_bounce":6,"1mo":2.0,"2mo":3.8,"3mo":4.1},{"peak_date":"2008-10-13","trough_date":"2008-10-15","bounce_date":"2008-10-20","drop_pct":11.2,"days_drop":2,"bounce_pct":9.8,"retrace_pct":77.6,"days_bounce":3,"1mo":1.3,"2mo":-2.5,"3mo":-6.2}]}};
let rrThreshold = 2;
window.rrTab = function rrTab(t, btn) {
  rrThreshold = t;
  document.querySelectorAll('.rr-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRelief();
};
function renderRelief() {
  const el = document.getElementById('rr-content');
  if (!el) return;
  const d = RR_DATA[String(rrThreshold)];
  if (!d) { el.innerHTML = '<p style="color:var(--text3)">No data</p>'; return; }
  const s = n => n >= 0 ? '+' : '';
  const fc = n => n >= 0 ? '#00ff88' : '#ff3355';
  const pct = n => n != null ? (n>=0?'+':'')+n.toFixed(1)+'%' : '—';

  // Fib color map
  const fibColors = [
    {min:0,    max:38.2, color:'#ff3355', label:'<38.2%'},
    {min:38.2, max:50,   color:'#ff8800', label:'38.2–50%'},
    {min:50,   max:61.8, color:'#ffcc00', label:'50–61.8%'},
    {min:61.8, max:70,   color:'#88cc00', label:'61.8–70%'},
    {min:70,   max:100,  color:'#00ff88', label:'70–100%'},
    {min:100,  max:9999, color:'#00ccff', label:'>100%'},
  ];

  // Fib chart — horizontal bar rows, one per bucket
  const total = d.buckets.reduce((a,b) => a+b.count, 0);
  const maxCount = Math.max(...d.buckets.map(b => b.count), 1);
  const fibRows = d.buckets.map((b,i) => {
    const pct2 = total > 0 ? b.count/total*100 : 0;
    const c = fibColors[i]?.color || '#888';
    const barW = Math.round(b.count / maxCount * 100);
    return `<div style="display:grid;grid-template-columns:110px 1fr 48px 52px;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      <div style="font-family:'Orbitron',monospace;font-size:10px;color:${c};text-align:right;">${b.label}</div>
      <div style="height:22px;background:var(--bg3);border-radius:3px;overflow:hidden;">
        <div style="width:${barW}%;height:100%;background:${c};opacity:0.75;border-radius:3px;transition:width .3s;"></div>
      </div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${c};text-align:right;font-weight:bold;">${b.count}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text3);text-align:right;">${pct2.toFixed(0)}%</div>
    </div>`;
  }).join('');

  // Events table
  const evRows = d.events.map(e => {
    const rc = e.retrace_pct > 100 ? '#00ccff' : e.retrace_pct >= 70 ? '#00ff88' : e.retrace_pct >= 61.8 ? '#88cc00' : e.retrace_pct >= 50 ? '#ffcc00' : e.retrace_pct >= 38.2 ? '#ff8800' : '#ff3355';
    const r1c = e['1mo'] != null ? fc(e['1mo']) : 'var(--text3)';
    const r3c = e['3mo'] != null ? fc(e['3mo']) : 'var(--text3)';
    return `<tr>
      <td style="color:var(--text3)">${e.peak_date}</td>
      <td style="color:#ff3355">-${e.drop_pct.toFixed(1)}%</td>
      <td style="color:var(--text3)">${e.days_drop}d</td>
      <td style="color:var(--text3)">${e.trough_date}</td>
      <td style="color:#00ff88">+${e.bounce_pct.toFixed(1)}%</td>
      <td style="color:${rc};font-weight:bold">${e.retrace_pct.toFixed(0)}%</td>
      <td style="color:var(--text3)">${e.days_bounce}d</td>
      <td style="color:${r1c}">${e['1mo'] != null ? pct(e['1mo']) : '—'}</td>
      <td style="color:${r3c}">${e['3mo'] != null ? pct(e['3mo']) : '—'}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="rr-stat-grid">
      <div class="rr-stat">
        <div class="rr-stat-lbl">EVENTS (1993–2026)</div>
        <div class="rr-stat-val" style="color:var(--cyan)">${d.count}</div>
        <div class="rr-stat-sub">avg drop ${d.avg_drop}% over ${d.avg_days_drop}d</div>
      </div>
      <div class="rr-stat">
        <div class="rr-stat-lbl">AVG BOUNCE</div>
        <div class="rr-stat-val" style="color:#00ff88">+${d.avg_bounce_pct}%</div>
        <div class="rr-stat-sub">median +${d.med_bounce_pct}% · avg ${d.avg_days_bounce}d duration</div>
      </div>
      <div class="rr-stat">
        <div class="rr-stat-lbl">AVG RETRACEMENT</div>
        <div class="rr-stat-val" style="color:#ffcc00">${d.avg_retrace_pct.toFixed(0)}%</div>
        <div class="rr-stat-sub">median ${d.med_retrace_pct.toFixed(0)}% of drop recovered</div>
      </div>
      <div class="rr-stat" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;padding:0;overflow:hidden;">
        ${['1mo','2mo','3mo'].map(k => {
          const f = d.fwd[k];
          if (!f) return `<div style="padding:10px 8px;text-align:center;border-right:1px solid var(--border);"><div class="rr-stat-lbl">${k.toUpperCase()} FWD</div><div class="rr-stat-val" style="font-size:13px">—</div></div>`;
          return `<div style="padding:10px 8px;text-align:center;border-right:1px solid var(--border);"><div class="rr-stat-lbl">${k.toUpperCase()} FWD</div><div class="rr-stat-val" style="font-size:14px;color:${fc(f.avg)}">${pct(f.avg)}</div><div class="rr-stat-sub">${f.win}% win</div></div>`;
        }).join('')}
      </div>
    </div>

    <div class="es-section" style="margin-bottom:12px;">RETRACEMENT DISTRIBUTION — FIBONACCI LEVELS</div>
    <div style="margin-bottom:8px;padding:0 4px;">
      <div style="display:grid;grid-template-columns:110px 1fr 48px 52px;gap:10px;padding:0 0 6px;border-bottom:1px solid var(--border);margin-bottom:2px;">
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);text-align:right;letter-spacing:1px;">LEVEL</div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);letter-spacing:1px;">FREQUENCY</div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);text-align:right;letter-spacing:1px;">COUNT</div>
        <div style="font-family:'Orbitron',monospace;font-size:7px;color:var(--text3);text-align:right;letter-spacing:1px;">OF TOTAL</div>
      </div>
      ${fibRows}
    </div>
    <div style="margin-bottom:20px;padding:8px;background:rgba(255,204,0,0.06);border-left:3px solid #ffcc00;border-radius:0 3px 3px 0;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">
      Median retracement: <span style="color:#ffcc00;font-weight:bold;font-size:13px;">${d.med_retrace_pct.toFixed(0)}%</span>
      &nbsp;·&nbsp; Avg: <span style="color:var(--text2);">${d.avg_retrace_pct.toFixed(0)}%</span>
      &nbsp;·&nbsp; <span style="color:var(--text3);">Fib levels: 23.6 · 38.2 · 50 · 61.8 · 70 · 100</span>
    </div>

    <div class="es-section" style="margin-bottom:8px;">RECENT EVENTS (MOST RECENT FIRST)</div>
    <div style="overflow-x:auto;">
      <table class="rr-evt-table">
        <thead><tr>
          <th>PEAK DATE</th><th>DROP</th><th>DAYS ↓</th><th>TROUGH</th>
          <th>BOUNCE</th><th>RETRACE</th><th>DAYS ↑</th><th>+1MO</th><th>+3MO</th>
        </tr></thead>
        <tbody>${evRows}</tbody>
      </table>
    </div>
    <p class="es-foot" style="margin-top:12px;">* Clean pullback = drop from peak with no single-day rally &gt;1.5% before threshold. Bounce tracked until price breaks trough by &gt;1%. Retracement = bounce ÷ total drop. Forward returns from trough date (~21/63 trading days).</p>
  `;
}

let esLookback = 'all_time';
window.ES_DATA = ES_DATA;
window.esLookback = esLookback;
function ES() { return ES_DATA[esLookback]; }
function esFmt(n,d=2){const v=parseFloat(n)||0;return `<span class="${v>=0?'up':'dn'}">${v>=0?'+':''}${v.toFixed(d)}%</span>`;}
function esWr(n){const v=parseFloat(n)||0;return `<span class="${v>=65?'up':v>=50?'neu':'dn'}">${v.toFixed(1)}%</span>`;}
function esN(n,d=2){return (parseFloat(n)||0).toFixed(d);}
function mkLB(id){
  const el=document.getElementById(id); if(!el)return;
  el.innerHTML=`<div class="es-lookback">
    <button class="es-lb-btn ${esLookback==='all_time'?'active':''}" onclick="esSetLookback('all_time')">ALL TIME (1993–2026)</button>
    <button class="es-lb-btn ${esLookback==='since_2020'?'active':''}" onclick="esSetLookback('since_2020')">SINCE 2020</button>
    <button class="es-lb-btn ${esLookback==='current_year'?'active':''}" onclick="esSetLookback('current_year')">2026 YTD</button>
  </div>`;
}
function mkMeta(id){
  const el=document.getElementById(id); if(!el)return;
  const m=ES().meta;
  el.textContent=`${m.daily_count.toLocaleString()} days · ${m.weekly_count.toLocaleString()} weeks · ${m.monthly_count} months`;
}
window.esSetLookback=function(lb){
  esLookback=lb; window.esLookback=lb; esRenderAll();
};
window.esSub=function(id,el){
  document.querySelectorAll('.es-subtab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.es-panel').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('es-'+id).classList.add('active');
  if(id==='relief') renderRelief();
};

// ---- DAY OF WEEK ----
function esRenderDOW(){
  mkLB('es-dow-lb'); mkMeta('es-dow-meta');
  const d=ES().day_of_week;
  const maxR=Math.max(...d.map(x=>Math.abs(x.avg_return||0)))||0.1;
  document.getElementById('es-dow-bars').innerHTML=`<div style="display:flex;align-items:flex-end;gap:14px;height:120px;">
    ${d.map(x=>{const h=Math.max((Math.abs(x.avg_return)/maxR)*100,3);const col=x.avg_return>=0?'var(--green)':'var(--red)';
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:120px;justify-content:flex-end;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${col}">${x.avg_return>=0?'+':''}${esN(x.avg_return,2)}%</span>
        <div style="width:100%;height:${h}px;background:${col};opacity:0.75;border-radius:4px 4px 0 0;"></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text3)">${x.day.slice(0,3).toUpperCase()}</span></div>`;}).join('')}
  </div>`;
  document.getElementById('es-dow-tbody').innerHTML=d.map(x=>`<tr>
    <td>${x.day}</td><td>${esFmt(x.avg_return)}</td><td>${esFmt(x.median_return)}</td>
    <td>${esWr(x.win_rate)}</td><td style="color:var(--text3)">$${esN(x.avg_range)}</td>
    <td class="up">+${esN(x.best)}%</td><td class="dn">${esN(x.worst)}%</td>
    <td style="color:var(--text3)">${x.count.toLocaleString()}</td></tr>`).join('');
  document.getElementById('es-dow-context-tbl').innerHTML=`<thead><tr><th>Day</th><th>After Up Day (avg)</th><th>After Down Day (avg)</th><th>Interpretation</th></tr></thead><tbody>
    ${d.map(x=>`<tr><td>${x.day}</td><td>${esFmt(x.after_green_avg)}</td><td>${esFmt(x.after_red_avg)}</td>
      <td style="text-align:left;color:var(--text3);font-size:12px;">${x.after_red_avg>(x.after_green_avg+0.02)?'Mean reversion — red days tend to bounce here':x.after_green_avg>(x.after_red_avg+0.02)?'Momentum — up days tend to follow up days':'No significant bias'}</td></tr>`).join('')}
    </tbody>`;
  const ds=ES().daily_streaks||{};
  document.getElementById('es-daily-mom-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">GREEN AFTER GREEN DAY</div><div class="es-card-val ${parseFloat(ds.p_green_after_green||0)>=55?'up':'neu'}">${esN(ds.p_green_after_green||0,1)}%</div><div class="es-card-sub">prob next day up</div></div>
    <div class="es-card"><div class="es-card-label">GREEN AFTER RED DAY</div><div class="es-card-val ${parseFloat(ds.p_green_after_red||0)>=55?'up':'neu'}">${esN(ds.p_green_after_red||0,1)}%</div><div class="es-card-sub">mean reversion signal</div></div>
    <div class="es-card"><div class="es-card-label">MAX DAILY GREEN STREAK</div><div class="es-card-val up">${ds.max_green||0}</div><div class="es-card-sub">consecutive up days</div></div>
    <div class="es-card"><div class="es-card-label">MAX DAILY RED STREAK</div><div class="es-card-val dn">${ds.max_red||0}</div><div class="es-card-sub">consecutive down days</div></div>
    <div class="es-card"><div class="es-card-label">AFTER 2+ GREEN DAYS</div><div class="es-card-val ${(ds.after_2green_avg||0)>=0?'up':'dn'}">${(ds.after_2green_avg||0)>=0?'+':''}${esN(ds.after_2green_avg||0)}%</div><div class="es-card-sub">${esN(ds.after_2green_winrate||0,1)}% win rate</div></div>
    <div class="es-card"><div class="es-card-label">AFTER 2+ RED DAYS</div><div class="es-card-val ${(ds.after_2red_avg||0)>=0?'up':'dn'}">${(ds.after_2red_avg||0)>=0?'+':''}${esN(ds.after_2red_avg||0)}%</div><div class="es-card-sub">${esN(ds.after_2red_winrate||0,1)}% win rate</div></div>`;
}

// ---- WEEK OF MONTH ----
function esRenderWOM(){
  mkLB('es-wom-lb'); mkMeta('es-wom-meta');
  const wom=ES().week_of_month;
  const avgAll=wom.reduce((s,w)=>s+(w.avg_return||0),0)/wom.length;
  const maxR=Math.max(...wom.map(w=>Math.abs(w.avg_return||0)))||0.1;
  document.getElementById('es-wom-bars').innerHTML=`<div style="display:flex;align-items:flex-end;gap:14px;height:110px;">
    ${wom.map(w=>{const h=Math.max((Math.abs(w.avg_return)/maxR)*95,3);const col=(w.avg_return||0)>=0?'var(--green)':'var(--red)';
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:110px;justify-content:flex-end;">
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${col}">${(w.avg_return||0)>=0?'+':''}${esN(w.avg_return)}%</span>
        <div style="width:100%;height:${h}px;background:${col};opacity:0.75;border-radius:4px 4px 0 0;"></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text3)">${w.week}</span></div>`;}).join('')}
  </div>`;
  document.getElementById('es-wom-tbody').innerHTML=wom.map(w=>{const e=(w.avg_return||0)-avgAll;
    return `<tr${(w.avg_return||0)===Math.max(...wom.map(x=>x.avg_return||0))?' class="row-highlight"':''}>
      <td>${w.week}</td><td>${esFmt(w.avg_return)}</td><td>${esFmt(w.median_return)}</td>
      <td>${esWr(w.win_rate)}</td>
      <td class="up">+${esN(w.best)}%</td><td class="dn">${esN(w.worst)}%</td>
      <td style="color:var(--text3)">${(w.count||0).toLocaleString()}</td>
      <td>${e>=0?`<span class="up">+${e.toFixed(2)}%</span>`:`<span class="dn">${e.toFixed(2)}%</span>`}</td></tr>`;}).join('');
  const best=wom.reduce((a,b)=>(b.avg_return||0)>(a.avg_return||0)?b:a);
  const worst=wom.reduce((a,b)=>(b.avg_return||0)<(a.avg_return||0)?b:a);
  document.getElementById('es-wom-insight').innerHTML=`<strong>Turn-of-month effect:</strong> ${best.week} (avg <span class="up">+${esN(best.avg_return)}%</span>, ${esN(best.win_rate,1)}% WR) is the strongest — consistent with institutional rebalancing and 401k inflows hitting at month-start. ${worst.week} (avg ${esFmt(worst.avg_return)}) is the weakest. Edge = <span class="up">+${esN((best.avg_return||0)-(worst.avg_return||0))}%</span> between best and worst week.`;
}

// ---- SEASONALITY ----
function esRenderSeasonality(){
  mkLB('es-sea-lb'); mkMeta('es-sea-meta');
  const s=ES().seasonality;
  const maxAbs=Math.max(...s.map(m=>Math.abs(m.avg_return||0)))||0.1;
  document.getElementById('es-season-bars').innerHTML=s.map(m=>{
    const pct=(Math.abs(m.avg_return||0)/maxAbs)*46,pos=(m.avg_return||0)>=0;
    const col=pos?'var(--green)':'var(--red)',wc=(m.win_rate||0)>=65?'var(--green)':(m.win_rate||0)>=55?'var(--yellow)':'var(--red)';
    return `<div class="es-bar-row"><div class="es-bar-lbl">${m.month}</div>
      <div class="es-bar-outer"><div class="es-bar-mid"></div>
        <div class="es-bar-fill ${pos?'pos':'neg'}" style="width:${pct}%"></div></div>
      <div class="es-bar-val" style="color:${col}">${pos?'+':''}${esN(m.avg_return)}%</div>
      <div class="es-wr-pill" style="color:${wc}">${esN(m.win_rate,1)}% WR</div></div>`;}).join('');
  const ranked=[...s].sort((a,b)=>(b.avg_return||0)-(a.avg_return||0));
  document.getElementById('es-season-tbody').innerHTML=s.map(m=>{
    const r=ranked.findIndex(x=>x.month===m.month)+1;
    const b=r===1?' <span class="es-badge top">#1</span>':r===12?' <span class="es-badge bot">WORST</span>':'';
    return `<tr>
      <td>${m.month}${b}</td>
      <td>${esFmt(m.avg_return)}</td><td>${esFmt(m.median_return)}</td><td>${esWr(m.win_rate)}</td>
      <td>${esFmt(m.daily_avg)}</td><td>${esWr(m.daily_win_rate)}</td>
      <td style="color:var(--text3)">$${esN(m.avg_vol)}</td>
      <td class="up">+${esN(m.best)}%</td><td class="dn">${esN(m.worst)}%</td>
      <td style="color:var(--text3)">${m.count}</td></tr>`;}).join('');
  const top3=ranked.slice(0,3),bot3=ranked.slice(-3).reverse();
  document.getElementById('es-season-cards').innerHTML=
    top3.map(m=>`<div class="es-card"><div class="es-card-label">${m.month} · STRONG</div><div class="es-card-val up">+${esN(m.avg_return)}%</div><div class="es-card-sub">${esN(m.win_rate,1)}% monthly WR</div></div>`).join('')+
    bot3.map(m=>`<div class="es-card"><div class="es-card-label">${m.month} · WEAK</div><div class="es-card-val ${(m.avg_return||0)>=0?'up':'dn'}">${(m.avg_return||0)>=0?'+':''}${esN(m.avg_return)}%</div><div class="es-card-sub">${esN(m.win_rate,1)}% monthly WR</div></div>`).join('');
}

// ---- QUARTERLY ----
function esRenderQuarterly(){
  mkLB('es-q-lb'); mkMeta('es-q-meta');
  const q=ES().quarterly;
  document.getElementById('es-q-cards').innerHTML=q.map(x=>`
    <div class="es-card"><div class="es-card-label">${x.quarter.split(' ')[0]}</div>
      <div class="es-card-val ${(x.monthly_avg||0)>=0?'up':'dn'}">${(x.monthly_avg||0)>=0?'+':''}${esN(x.monthly_avg)}%</div>
      <div class="es-card-sub">${esN(x.monthly_win_rate,1)}% WR · ${x.monthly_count} months</div></div>`).join('');
  document.getElementById('es-q-tbody').innerHTML=q.map(x=>`<tr>
    <td>${x.quarter}</td>
    <td>${esFmt(x.monthly_avg)}</td><td>${esWr(x.monthly_win_rate)}</td>
    <td>${esFmt(x.daily_avg)}</td><td>${esWr(x.daily_win_rate)}</td>
    <td style="color:var(--text3)">$${esN(x.avg_vol)}</td>
    <td class="up">+${esN(x.best)}%</td><td class="dn">${esN(x.worst)}%</td>
    <td style="color:var(--text3)">${x.monthly_count}</td></tr>`).join('');
  const best=q.reduce((a,b)=>(b.monthly_avg||0)>(a.monthly_avg||0)?b:a);
  const worst=q.reduce((a,b)=>(b.monthly_avg||0)<(a.monthly_avg||0)?b:a);
  document.getElementById('es-q-insight').innerHTML=`<strong>${best.quarter.split(' ')[0]} is the strongest quarter</strong> — avg <span class="up">+${esN(best.monthly_avg)}%</span> per month, ${esN(best.monthly_win_rate,1)}% win rate, vs <strong>${worst.quarter.split(' ')[0]}</strong> the weakest at ${esFmt(worst.monthly_avg)}/month. Q4 seasonal strength is driven by end-of-year fund positioning, tax considerations, and the Santa Rally window in November. Daily edge in Q4: <span class="up">+${esN(q.find(x=>x.q_num===4)?.daily_avg||0)}%</span>/day vs <span class="${(q.find(x=>x.q_num===3)?.daily_avg||0)>=0?'up':'dn'}">${(q.find(x=>x.q_num===3)?.daily_avg||0)>=0?'+':''}${esN(q.find(x=>x.q_num===3)?.daily_avg||0)}%</span>/day in Q3 (the weakest).`;
}

// ---- YEARLY ----
function esRenderYearly(){
  mkLB('es-yr-lb'); mkMeta('es-yr-meta');
  const ys=ES().yearly_summary;
  document.getElementById('es-yr-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">AVG ANNUAL RETURN</div><div class="es-card-val up">+${esN(ys.avg)}%</div><div class="es-card-sub">${ys.count} years sampled</div></div>
    <div class="es-card"><div class="es-card-label">MEDIAN ANNUAL RETURN</div><div class="es-card-val up">+${esN(ys.median)}%</div><div class="es-card-sub">50th percentile year</div></div>
    <div class="es-card"><div class="es-card-label">ANNUAL WIN RATE</div><div class="es-card-val up">${esN(ys.win_rate,1)}%</div><div class="es-card-sub">% of positive years</div></div>
    <div class="es-card"><div class="es-card-label">BEST YEAR</div><div class="es-card-val up">+${esN(ys.best)}%</div><div class="es-card-sub">single best calendar year</div></div>
    <div class="es-card"><div class="es-card-label">WORST YEAR</div><div class="es-card-val dn">${esN(ys.worst)}%</div><div class="es-card-sub">single worst calendar year</div></div>`;
  document.getElementById('es-yr-grid').innerHTML=(ys.years||[]).map(y=>`
    <div class="es-yr-cell ${y.green?'up':'dn'}">
      <div style="font-family:'Orbitron',monospace;font-size:10px;color:var(--text3)">${y.year}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${y.green?'var(--green)':'var(--red)'};margin-top:3px">${y.green?'+':''}${esN(y.return)}%</div>
    </div>`).join('');
}

// ---- STREAKS ----
function esRenderStreaks(){
  mkLB('es-str-lb'); mkMeta('es-str-meta');
  const s=ES().streaks;
  const sw=s.weekly||{},sm=s.monthly||{},sy=s.yearly||{},sd=s.daily||{};
  document.getElementById('es-streak-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">DAILY MAX GREEN</div><div class="es-card-val up">${sd.max_green||0}</div><div class="es-card-sub">consecutive up days</div></div>
    <div class="es-card"><div class="es-card-label">DAILY MAX RED</div><div class="es-card-val dn">${sd.max_red||0}</div><div class="es-card-sub">consecutive down days</div></div>
    <div class="es-card"><div class="es-card-label">WEEKLY MAX GREEN</div><div class="es-card-val up">${sw.max_green||0}</div><div class="es-card-sub">consecutive up weeks</div></div>
    <div class="es-card"><div class="es-card-label">WEEKLY MAX RED</div><div class="es-card-val dn">${sw.max_red||0}</div><div class="es-card-sub">consecutive down weeks</div></div>
    <div class="es-card"><div class="es-card-label">MONTHLY MAX GREEN</div><div class="es-card-val up">${sm.max_green||0}</div><div class="es-card-sub">consecutive up months</div></div>
    <div class="es-card"><div class="es-card-label">MONTHLY MAX RED</div><div class="es-card-val dn">${sm.max_red||0}</div><div class="es-card-sub">consecutive down months</div></div>
    <div class="es-card"><div class="es-card-label">YEARLY MAX GREEN</div><div class="es-card-val up">${sy.max_green||0}</div><div class="es-card-sub">consecutive up years</div></div>
    <div class="es-card"><div class="es-card-label">YEARLY MAX RED</div><div class="es-card-val dn">${sy.max_red||0}</div><div class="es-card-sub">consecutive down years</div></div>`;
  document.getElementById('es-momentum-tbl').innerHTML=`<thead><tr><th>Timeframe</th><th>Condition</th><th>Prob Next Green</th><th>Interpretation</th></tr></thead><tbody>
    <tr><td>Daily</td><td>After green day</td><td>${esWr(sd.p_green_after_green||0)}</td><td style="text-align:left;color:var(--text3)">Slight momentum — marginal follow-through edge</td></tr>
    <tr><td>Daily</td><td>After red day</td><td>${esWr(sd.p_green_after_red||0)}</td><td style="text-align:left;color:var(--text3)">Mean reversion — SPY tends to bounce after down days</td></tr>
    <tr><td>Weekly</td><td>After green week</td><td>${esWr(sw.p_green_after_green||0)}</td><td style="text-align:left;color:var(--text3)">${(sw.p_green_after_green||0)>55?'Momentum — positive weekly follow-through':'Near random — weekly direction weakly autocorrelated'}</td></tr>
    <tr><td>Weekly</td><td>After red week</td><td>${esWr(sw.p_green_after_red||0)}</td><td style="text-align:left;color:var(--text3)">${(sw.p_green_after_red||0)>55?'Mean reversion — bounces common after down weeks':'Near random — no significant reversion'}</td></tr>
    <tr><td>Monthly</td><td>After green month</td><td>${esWr(sm.p_green_after_green||0)}</td><td style="text-align:left;color:var(--text3)">Strong momentum — monthly continuation is the dominant edge</td></tr>
    </tbody>`;
  document.getElementById('es-after2g-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">WEEKLY AVG NEXT WEEK</div><div class="es-card-val ${(sw.after_2green_avg||0)>=0?'up':'dn'}">${(sw.after_2green_avg||0)>=0?'+':''}${esN(sw.after_2green_avg||0)}%</div><div class="es-card-sub">after 2+ green weeks</div></div>
    <div class="es-card"><div class="es-card-label">WEEKLY WIN RATE</div><div class="es-card-val neu">${esN(sw.after_2green_winrate||0,1)}%</div><div class="es-card-sub">momentum fades short-term</div></div>
    <div class="es-card"><div class="es-card-label">DAILY AVG NEXT DAY</div><div class="es-card-val ${(sd.after_2green_avg||0)>=0?'up':'dn'}">${(sd.after_2green_avg||0)>=0?'+':''}${esN(sd.after_2green_avg||0)}%</div><div class="es-card-sub">after 2+ green days</div></div>
    <div class="es-card"><div class="es-card-label">DAILY WIN RATE</div><div class="es-card-val neu">${esN(sd.after_2green_winrate||0,1)}%</div><div class="es-card-sub">daily follow-through</div></div>`;
  document.getElementById('es-after2r-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">WEEKLY AVG NEXT WEEK</div><div class="es-card-val up">+${esN(sw.after_2red_avg||0)}%</div><div class="es-card-sub">after 2+ red weeks</div></div>
    <div class="es-card"><div class="es-card-label">WEEKLY WIN RATE</div><div class="es-card-val up">${esN(sw.after_2red_winrate||0,1)}%</div><div class="es-card-sub">mean reversion bounce edge</div></div>
    <div class="es-card"><div class="es-card-label">DAILY AVG NEXT DAY</div><div class="es-card-val ${(sd.after_2red_avg||0)>=0?'up':'dn'}">${(sd.after_2red_avg||0)>=0?'+':''}${esN(sd.after_2red_avg||0)}%</div><div class="es-card-sub">after 2+ red days</div></div>
    <div class="es-card"><div class="es-card-label">DAILY WIN RATE</div><div class="es-card-val up">${esN(sd.after_2red_winrate||0,1)}%</div><div class="es-card-sub">daily bounce probability</div></div>`;
  document.getElementById('es-after3g-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">AVG NEXT WEEK</div><div class="es-card-val ${(sw.after_3green_avg||0)>=0?'up':'dn'}">${(sw.after_3green_avg||0)>=0?'+':''}${esN(sw.after_3green_avg||0)}%</div><div class="es-card-sub">after 3+ green weeks</div></div>
    <div class="es-card"><div class="es-card-label">WIN RATE</div><div class="es-card-val neu">${esN(sw.after_3green_winrate||0,1)}%</div><div class="es-card-sub">extended run then what?</div></div>`;
  document.getElementById('es-after3r-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">AVG NEXT WEEK</div><div class="es-card-val ${(sw.after_3red_avg||0)>=0?'up':'dn'}">${(sw.after_3red_avg||0)>=0?'+':''}${esN(sw.after_3red_avg||0)}%</div><div class="es-card-sub">after 3+ red weeks</div></div>
    <div class="es-card"><div class="es-card-label">WIN RATE</div><div class="es-card-val up">${esN(sw.after_3red_winrate||0,1)}%</div><div class="es-card-sub">capitulation bounce edge</div></div>`;
}

// ---- VOL EDGE ----
function esRenderVolEdge(){
  mkLB('es-vol-lb'); mkMeta('es-vol-meta');
  const v=ES().vol_edge;
  document.getElementById('es-vol-explainer').innerHTML=`<strong>How to read this:</strong> SPY weeks and days are sorted into 5 volatility buckets by True Range (High−Low). <strong>During return</strong> = what SPY did in that period. <strong>Next period avg</strong> = what happened the FOLLOWING week/day. This shows whether high-vol days predict bounces, and whether low-vol periods precede big moves. Risk-adj = avg return ÷ avg true range — higher is more efficient.`;
  const bucketColor=(i)=>['rgba(0,255,136,0.7)','rgba(0,204,255,0.7)','rgba(255,204,0,0.7)','rgba(255,136,0,0.7)','rgba(255,51,85,0.7)'][i];
  const wb=v.weekly_buckets||[];
  document.getElementById('es-wvol-rows').innerHTML=wb.map((b,i)=>`
    <div class="es-vol-bucket" style="background:${i%2?'rgba(255,255,255,0.01)':'transparent'}">
      <div>${b.bucket} <div class="es-vol-bar" style="width:${(i+1)*20}%;background:${bucketColor(i)}"></div></div>
      <div style="color:var(--text3)">$${esN(b.threshold_low)}</div>
      <div style="color:var(--text3)">$${esN(b.threshold_high)}</div>
      <div>${esFmt(b.self_avg)}</div>
      <div>${esWr(b.self_winrate)}</div>
      <div style="color:${(b.after_avg||0)>=0?'var(--green)':'var(--red)'};font-weight:bold">${(b.after_avg||0)>=0?'+':''}${esN(b.after_avg)}%</div>
    </div>`).join('');
  const db=v.daily_buckets||[];
  document.getElementById('es-dvol-rows').innerHTML=db.map((b,i)=>`
    <div class="es-vol-bucket" style="background:${i%2?'rgba(255,255,255,0.01)':'transparent'}">
      <div>${b.bucket} <div class="es-vol-bar" style="width:${(i+1)*20}%;background:${bucketColor(i)}"></div></div>
      <div style="color:var(--text3)">$${esN(b.threshold_low)}</div>
      <div style="color:var(--text3)">$${esN(b.threshold_high)}</div>
      <div>${esFmt(b.self_avg)}</div>
      <div>${esWr(b.self_winrate)}</div>
      <div style="color:${(b.after_avg||0)>=0?'var(--green)':'var(--red)'};font-weight:bold">${(b.after_avg||0)>=0?'+':''}${esN(b.after_avg)}%</div>
    </div>`).join('');
  const wAvgTR=v.weekly_avg_tr||1, dAvgTR=v.daily_avg_tr||1;
  document.getElementById('es-risk-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">WEEKLY RISK-ADJ (AVG)</div><div class="es-card-val neu">${esN(v.risk_adj_all,4)}</div><div class="es-card-sub">return per $1 of weekly range</div></div>
    <div class="es-card"><div class="es-card-label">WEEKLY AVG TRUE RANGE</div><div class="es-card-val neu">$${esN(wAvgTR)}</div><div class="es-card-sub">avg weekly High−Low</div></div>
    <div class="es-card"><div class="es-card-label">DAILY AVG TRUE RANGE</div><div class="es-card-val neu">$${esN(dAvgTR)}</div><div class="es-card-sub">avg daily High−Low</div></div>
    <div class="es-card"><div class="es-card-label">HI-VOL SELF RETURN</div><div class="es-card-val ${(v.hi_vol_self_avg||0)>=0?'up':'dn'}">${(v.hi_vol_self_avg||0)>=0?'+':''}${esN(v.hi_vol_self_avg||0)}%</div><div class="es-card-sub">during high-vol weeks (top 20%)</div></div>`;
  document.getElementById('es-consec-vol-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">NEXT WEEK AVG RETURN</div><div class="es-card-val ${(v.after_consec_hivol_avg||0)>=0?'up':'dn'}">${(v.after_consec_hivol_avg||0)>=0?'+':''}${esN(v.after_consec_hivol_avg||0)}%</div><div class="es-card-sub">after 2+ high-vol weeks in a row</div></div>
    <div class="es-card"><div class="es-card-label">NEXT WEEK WIN RATE</div><div class="es-card-val ${(v.after_consec_hivol_winrate||0)>=55?'up':'neu'}">${esN(v.after_consec_hivol_winrate||0,1)}%</div><div class="es-card-sub">bounce probability elevated</div></div>`;
}

// ---- RECOVERY ----
function esRenderRecovery(){
  mkLB('es-rec-lb'); mkMeta('es-rec-meta');
  const r=ES().recovery;
  const rows=[{l:'-5% or more',k:'dd5'},{l:'-10% or more',k:'dd10'},{l:'-15% or more',k:'dd15'},{l:'-20% or more',k:'dd20'}];
  document.getElementById('es-rec-cards').innerHTML=rows.map(({l,k})=>`
    <div class="es-card"><div class="es-card-label">${l} EVENTS</div>
      <div class="es-card-val neu">${r[k]?.count||0}</div>
      <div class="es-card-sub">median ${r[k]?.median_weeks||0}w recovery</div></div>`).join('');
  document.getElementById('es-rec-tbody').innerHTML=rows.map(({l,k})=>`<tr>
    <td>${l}</td><td style="color:var(--yellow)">${r[k]?.count||0}</td>
    <td style="color:var(--orange)">${r[k]?.avg_weeks||0} wks</td>
    <td style="color:var(--cyan)">${r[k]?.median_weeks||0} wks</td>
    <td style="color:var(--red)">${r[k]?.max_weeks||0} wks</td>
    <td style="color:var(--text3)">${((r[k]?.avg_weeks||0)/4.33).toFixed(1)} mo</td></tr>`).join('');
  const mxW=Math.max(r.dd5?.avg_weeks||0,r.dd10?.avg_weeks||0,r.dd15?.avg_weeks||0,r.dd20?.avg_weeks||0,1);
  document.getElementById('es-rec-visual').innerHTML=rows.map(({l,k})=>`
    <div style="margin-bottom:18px;">
      <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text3);margin-bottom:7px;">${l}</div>
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:4px;">
        <span style="font-size:11px;color:var(--text3);width:52px;font-family:'Share Tech Mono',monospace">AVG</span>
        <div style="flex:1;height:9px;background:var(--bg2);border-radius:5px;overflow:hidden;">
          <div style="width:${Math.min((r[k]?.avg_weeks||0)/mxW*100,100)}%;height:100%;background:var(--orange);border-radius:5px;"></div></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--orange);width:58px">${r[k]?.avg_weeks||0}w</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;">
        <span style="font-size:11px;color:var(--text3);width:52px;font-family:'Share Tech Mono',monospace">MEDIAN</span>
        <div style="flex:1;height:9px;background:var(--bg2);border-radius:5px;overflow:hidden;">
          <div style="width:${Math.min((r[k]?.median_weeks||0)/mxW*100,100)}%;height:100%;background:var(--cyan);border-radius:5px;"></div></div>
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--cyan);width:58px">${r[k]?.median_weeks||0}w</span>
      </div>
    </div>`).join('');
  document.getElementById('es-rec-insight').innerHTML=`<strong>Key takeaway:</strong> The average recovery time is heavily skewed by a few extreme events (2008, 2020). The <span class="neu">median</span> is far more representative — a -10% drawdown has a median recovery of <span class="cyan" style="color:var(--cyan)">${r.dd10?.median_weeks||0} weeks</span> (${((r.dd10?.median_weeks||0)/4.33).toFixed(1)} months). Note that the average is distorted by multi-year bear markets. In post-2020 data, recoveries have been faster.`;
}

// ---- HOLIDAYS ----
function esRenderHolidays(){
  mkLB('es-hol-lb'); mkMeta('es-hol-meta');
  const h=ES().holidays, s=ES().santa, avg=0.21;
  const sw=h.short_week||{}, asw=h.after_short_week||{};
  document.getElementById('es-sw-cards').innerHTML=`
    <div class="es-card"><div class="es-card-label">SHORT WEEK AVG RETURN</div><div class="es-card-val ${(sw.avg||0)>=0?'up':'dn'}">${(sw.avg||0)>=0?'+':''}${esN(sw.avg)}%</div><div class="es-card-sub">vs +0.21% full week avg</div></div>
    <div class="es-card"><div class="es-card-label">SHORT WEEK WIN RATE</div><div class="es-card-val ${(sw.win_rate||0)>=60?'up':'neu'}">${esN(sw.win_rate,1)}%</div><div class="es-card-sub">${sw.count||0} short weeks sampled</div></div>
    <div class="es-card"><div class="es-card-label">SHORT WEEK EDGE</div><div class="es-card-val ${((sw.avg||0)-avg)>=0?'up':'dn'}">${((sw.avg||0)-avg)>=0?'+':''}${esN((sw.avg||0)-avg)}%</div><div class="es-card-sub">vs average full week</div></div>
    <div class="es-card"><div class="es-card-label">WEEK AFTER SHORT WEEK</div><div class="es-card-val ${(asw.avg||0)>=0?'up':'dn'}">${(asw.avg||0)>=0?'+':''}${esN(asw.avg)}%</div><div class="es-card-sub">${esN(asw.win_rate,1)}% WR · ${asw.count||0} weeks</div></div>`;
  document.getElementById('es-santa-boxes').innerHTML=`
    <div class="es-box"><div class="es-box-label">NOVEMBER <span class="es-badge top">#1 MONTH</span></div>
      <div class="es-box-row"><span class="es-box-lbl">Monthly Avg</span><span class="up">+${esN(s.nov_avg)}%</span></div>
      <div class="es-box-row"><span class="es-box-lbl">Monthly WR</span><span class="up">${esN(s.nov_win,1)}%</span></div>
      <div class="es-box-row"><span class="es-box-lbl">Daily Avg</span>${esFmt(s.nov_daily_avg)}</div>
      <div class="es-box-row"><span class="es-box-lbl">Daily WR</span><span class="${(s.nov_daily_win||0)>=55?'up':'neu'}">${esN(s.nov_daily_win||0,1)}%</span></div></div>
    <div class="es-box"><div class="es-box-label">DECEMBER</div>
      <div class="es-box-row"><span class="es-box-lbl">Monthly Avg</span>${esFmt(s.dec_avg)}</div>
      <div class="es-box-row"><span class="es-box-lbl">Monthly WR</span><span class="neu">${esN(s.dec_win,1)}%</span></div>
      <div class="es-box-row"><span class="es-box-lbl">Daily Avg</span>${esFmt(s.dec_daily_avg)}</div>
      <div class="es-box-row"><span class="es-box-lbl">Daily WR</span><span class="${(s.dec_daily_win||0)>=55?'up':'neu'}">${esN(s.dec_daily_win||0,1)}%</span></div></div>
    <div class="es-box"><div class="es-box-label">NOV+DEC vs REST OF YEAR</div>
      <div class="es-box-row"><span class="es-box-lbl">Nov+Dec Avg</span>${esFmt(s.novdec_avg)}</div>
      <div class="es-box-row"><span class="es-box-lbl">Nov+Dec WR</span><span class="up">${esN(s.novdec_win,1)}%</span></div>
      <div class="es-box-row"><span class="es-box-lbl">Rest of Year Avg</span>${esFmt(s.rest_avg)}</div>
      <div class="es-box-row"><span class="es-box-lbl">Edge</span><span class="up">+${esN((s.novdec_avg||0)-(s.rest_avg||0))}%/mo</span></div></div>`;
  document.getElementById('es-santa-tbl').innerHTML=`<thead><tr><th>Period</th><th>Avg Return</th><th>Win Rate</th><th>vs Rest of Year</th></tr></thead><tbody>
    <tr><td>November</td><td>${esFmt(s.nov_avg)}</td><td>${esWr(s.nov_win)}</td><td><span class="up">+${esN((s.nov_avg||0)-(s.rest_avg||0))}%</span></td></tr>
    <tr><td>December</td><td>${esFmt(s.dec_avg)}</td><td>${esWr(s.dec_win)}</td><td>${esFmt((s.dec_avg||0)-(s.rest_avg||0))}</td></tr>
    <tr><td>Nov+Dec Combined</td><td>${esFmt(s.novdec_avg)}</td><td>${esWr(s.novdec_win)}</td><td><span class="up">+${esN((s.novdec_avg||0)-(s.rest_avg||0))}%</span></td></tr>
    <tr><td>Jan–Oct (Baseline)</td><td>${esFmt(s.rest_avg)}</td><td>${esWr(s.rest_win)}</td><td><span class="neu">BASELINE</span></td></tr>
    </tbody>`;

  const holItems=[
    {k:'thanksgiving',label:'🦃 Thanksgiving Week',w:'thanksgiving_week',d:'thanksgiving_daily',window:'Nov 21–27'},
    {k:'christmas',label:'🎄 Christmas Week',w:'christmas_week',d:'christmas_daily',window:'Dec 21–27'},
    {k:'new_year',label:'🎆 New Year Window',w:'new_year_week',d:'new_year_daily',window:'Dec 28–Jan 3'},
    {k:'july4',label:'🇺🇸 July 4th Week',w:'july4_week',d:'july4_daily',window:'Jul 1–7'},
    {k:'memorial',label:'🪖 Memorial Day Week',w:'memorial_week',d:'memorial_daily',window:'May 24–31'},
    {k:'labor',label:'⚒️ Labor Day Week',w:'labor_week',d:'labor_daily',window:'Sep 1–7'},
    {k:'mlk',label:'✊ MLK Day (daily)',d:'mlk_daily',window:'Jan 15–21'},
    {k:'presidents',label:'🏛️ Presidents Day (daily)',d:'presidents_daily',window:'Feb 15–21'},
  ];
  document.getElementById('es-hol-grid').innerHTML=holItems.map(({label,w,d,window})=>{
    const wd=w?h[w]:null, dd=d?h[d]:null;
    const primary=wd||dd||{};
    const e=(primary.avg||0)-avg;
    return `<div class="es-hcard">
      <div class="es-hcard-title">${label}</div>
      <div class="es-hrow"><span class="es-hrow-lbl">${wd?'Weekly':'Daily'} Avg</span><span class="es-hrow-val ${(primary.avg||0)>=0?'up':'dn'}">${(primary.avg||0)>=0?'+':''}${esN(primary.avg)}%</span></div>
      <div class="es-hrow"><span class="es-hrow-lbl">Win Rate</span><span class="es-hrow-val" style="color:${(primary.win_rate||0)>=60?'var(--green)':(primary.win_rate||0)>=50?'var(--yellow)':'var(--red)'}">${esN(primary.win_rate,1)}%</span></div>
      ${dd&&wd?`<div class="es-hrow"><span class="es-hrow-lbl">Daily Avg</span><span class="es-hrow-val ${(dd.avg||0)>=0?'up':'dn'}">${(dd.avg||0)>=0?'+':''}${esN(dd.avg)}%</span></div>`:''}
      <div class="es-hrow"><span class="es-hrow-lbl">Edge vs Avg</span><span class="es-hrow-val ${e>=0?'up':'dn'}">${e>=0?'+':''}${esN(e)}%</span></div>
      <div style="font-size:10px;color:var(--dim);margin-top:8px;font-family:'Share Tech Mono',monospace">${window} · ${primary.count||0} years</div>
    </div>`;}).join('');

  const seasonalItems=[
    {label:'📉 Tax Loss Harvesting (SELL)',key:'tax_loss_sell',window:'Dec 15–31 daily',desc:'Year-end tax selling pressure'},
    {label:'📈 Tax Loss Bounce (BUY)',key:'tax_loss_buy',window:'Jan 1–10 daily',desc:'Stocks sold in Dec bought back'},
    {label:'🗓️ January Effect',key:'january_effect',window:'First 5 trading days of Jan',desc:'Small-cap / loser rebound'},
    {label:'🌱 Sell in May (May–Oct)',key:'sell_in_may',window:'May–Oct daily avg',desc:'Classic seasonal edge'},
    {label:'🍂 Buy in Nov (Nov–Apr)',key:'buy_in_nov',window:'Nov–Apr daily avg',desc:'Strong half of the year'},
    {label:'⚡ Triple Witching',key:'triple_witching',window:'3rd Fri of Mar/Jun/Sep/Dec',desc:'Options/futures expiry volatility'},
  ];
  document.getElementById('es-seasonal-grid').innerHTML=seasonalItems.map(({label,key,window,desc})=>{
    const x=h[key]||{};
    const e=(x.avg||0)-avg;
    return `<div class="es-hcard">
      <div class="es-hcard-title">${label}</div>
      <div class="es-hrow"><span class="es-hrow-lbl">Avg Return</span><span class="es-hrow-val ${(x.avg||0)>=0?'up':'dn'}">${(x.avg||0)>=0?'+':''}${esN(x.avg)}%</span></div>
      <div class="es-hrow"><span class="es-hrow-lbl">Win Rate</span><span class="es-hrow-val" style="color:${(x.win_rate||0)>=55?'var(--green)':(x.win_rate||0)>=45?'var(--yellow)':'var(--red)'}">${esN(x.win_rate,1)}%</span></div>
      <div class="es-hrow"><span class="es-hrow-lbl">Edge vs Avg</span><span class="es-hrow-val ${e>=0?'up':'dn'}">${e>=0?'+':''}${esN(e)}%</span></div>
      <div style="font-size:10px;color:var(--dim);margin-top:8px;font-family:'Share Tech Mono',monospace">${window}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">${desc}</div>
    </div>`;}).join('');

  // Full detail table
  const allHolRows=[
    {name:'Short Week',w:'short_week',wl:'< 5 trading days'},
    {name:'Thanksgiving',w:'thanksgiving_week',d:'thanksgiving_daily',wl:'Nov 21–27'},
    {name:'Christmas',w:'christmas_week',d:'christmas_daily',wl:'Dec 21–27'},
    {name:'New Year',w:'new_year_week',d:'new_year_daily',wl:'Dec 28–Jan 3'},
    {name:'July 4th',w:'july4_week',d:'july4_daily',wl:'Jul 1–7'},
    {name:'Memorial Day',w:'memorial_week',d:'memorial_daily',wl:'May 24–31'},
    {name:'Labor Day',w:'labor_week',d:'labor_daily',wl:'Sep 1–7'},
    {name:'MLK Day',d:'mlk_daily',wl:'Jan 15–21 daily'},
    {name:'Presidents Day',d:'presidents_daily',wl:'Feb 15–21 daily'},
    {name:'Tax Loss Sell',d:'tax_loss_sell',wl:'Dec 15–31 daily'},
    {name:'Tax Loss Buy',d:'tax_loss_buy',wl:'Jan 1–10 daily'},
    {name:'January Effect',d:'january_effect',wl:'First 5 days of Jan'},
    {name:'Sell in May',d:'sell_in_may',wl:'May–Oct daily'},
    {name:'Buy in Nov',d:'buy_in_nov',wl:'Nov–Apr daily'},
    {name:'Triple Witching',d:'triple_witching',wl:'3rd Fri Mar/Jun/Sep/Dec'},
  ];
  document.getElementById('es-hol-tbody').innerHTML=allHolRows.map(({name,w,d,wl})=>{
    const x=(w?h[w]:null)||(d?h[d]:null)||{};
    const e=(x.avg||0)-avg;
    return `<tr>
      <td>${name}</td><td style="text-align:left;color:var(--text3);font-size:12px">${wl}</td>
      <td>${esFmt(x.avg||0)}</td><td>${esFmt(x.median||0)}</td><td>${esWr(x.win_rate||0)}</td>
      <td style="color:var(--text3)">${x.count||0}</td>
      <td class="up">+${esN(x.best||0)}%</td><td class="dn">${esN(x.worst||0)}%</td>
    </tr>`;}).join('');
}

// ---- DATA RELEASES (v2 — exact dates from release_data.js) ----
let _relType = 'cpi';
let _relLookback = 'all';

const REL_COLORS = { cpi:'#ff8800', nfp:'#00ccff', fomc:'#8855ff' };
const REL_LABELS = { cpi:'CPI', nfp:'NFP', fomc:'FOMC' };

window.relSetLookback = function(lb, btn) {
  _relLookback = lb;
  // Scope to es-releases panel only — don't disturb mag7 or ev buttons
  document.querySelectorAll('#es-releases .rel-lb-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  esRenderReleases();
};

window.relSetType = function(type, btn) {
  _relType = type;
  document.querySelectorAll('#es-releases .rel-type-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  esRenderReleases();
};

function esRenderReleases(){
  if(typeof RELEASE_DATA === 'undefined') {
    const el = document.getElementById('rel-stat-cards');
    if(el) el.innerHTML = '<div class="no-data">Loading release data...</div>';
    return;
  }

  const today = new Date().toISOString().slice(0,10);
  const oneYrAgo = new Date(Date.now()-365*24*60*60*1000).toISOString().slice(0,10);
  const color = REL_COLORS[_relType];
  const label = REL_LABELS[_relType];

  // Filter by lookback
  let data = RELEASE_DATA[_relType] || [];
  if(_relLookback === '1yr') data = data.filter(d => d.date >= oneYrAgo);
  else if(_relLookback === '2026') data = data.filter(d => d.date.startsWith('2026'));

  // ── Upcoming banner ──────────────────────────────────────────────────────
  const bannerEl = document.getElementById('rel-upcoming-banner');
  if(bannerEl) {
    const upcoming = (RELEASE_DATA.upcoming[_relType] || []).filter(d => d >= today);
    const next = upcoming[0];
    if(next) {
      const nextDate = new Date(next+'T12:00:00');
      const daysAway = Math.ceil((nextDate - new Date()) / (1000*60*60*24));
      bannerEl.innerHTML = `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:${color}15;border:1px solid ${color}44;border-left:4px solid ${color};border-radius:4px;">
        <div style="font-family:'Orbitron',monospace;font-size:9px;color:${color};letter-spacing:1px;">NEXT ${label}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:16px;color:${color};">${next}</div>
        <div style="font-size:12px;color:var(--text3);">${daysAway} calendar days away</div>
        ${upcoming.slice(1,4).length ? `<div style="font-size:11px;color:var(--text3);margin-left:auto;">Also upcoming: ${upcoming.slice(1,4).join(' · ')}</div>` : ''}
      </div>`;
    } else {
      bannerEl.innerHTML = '';
    }
  }

  if(!data.length) {
    document.getElementById('rel-stat-cards').innerHTML = '<div class="no-data">No events in selected period</div>';
    document.getElementById('rel-table-body').innerHTML = '';
    return;
  }

  // ── Aggregate stats ──────────────────────────────────────────────────────
  const n = data.length;
  const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
  const pctUp = (arr, fn) => arr.filter(fn).length/arr.length*100;

  const dayRets   = data.map(d=>d.day_ret);
  const dayRanges = data.map(d=>d.range);
  const beforeRets = data.filter(d=>d.before_ret!==null).map(d=>d.before_ret);
  const afterRets  = data.filter(d=>d.after_ret!==null).map(d=>d.after_ret);
  const gaps       = data.map(d=>d.gap);

  const statCards = document.getElementById('rel-stat-cards');
  if(statCards) {
    const stats = [
      { l:'EVENTS',        v: n,                                          sub: `${_relLookback==='all'?'2020–2026':_relLookback==='1yr'?'Last 12 mo':'2026 YTD'}`, c:'var(--text2)' },
      { l:'DAY-OF % UP',   v: pctUp(dayRets,r=>r>0).toFixed(0)+'%',     sub: `avg ${avg(dayRets)>=0?'+':''}${avg(dayRets).toFixed(3)}%`, c: pctUp(dayRets,r=>r>0)>55?'#00ff88':pctUp(dayRets,r=>r>0)>45?'#ffcc00':'#ff3355' },
      { l:'AVG DAY RANGE', v: '$'+avg(dayRanges).toFixed(2),             sub: `high–low on event day`, c:'var(--cyan)' },
      { l:'BEFORE 5 DAYS', v: pctUp(beforeRets,r=>r>0).toFixed(0)+'%',  sub: `avg ${avg(beforeRets)>=0?'+':''}${avg(beforeRets).toFixed(3)}%`, c: pctUp(beforeRets,r=>r>0)>55?'#00ff88':'#ff8800' },
      { l:'AFTER 5 DAYS',  v: pctUp(afterRets,r=>r>0).toFixed(0)+'%',   sub: `avg ${avg(afterRets)>=0?'+':''}${avg(afterRets).toFixed(3)}%`, c: pctUp(afterRets,r=>r>0)>55?'#00ff88':'#ff3355' },
      { l:'AVG GAP',       v: (avg(gaps)>=0?'+':'')+avg(gaps).toFixed(3)+'%', sub: `open vs prev close`, c: avg(gaps)>=0?'#00ff88':'#ff3355' },
    ];
    statCards.innerHTML = `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;">
      ${stats.map(s=>`<div class="panel" style="text-align:center;border-top:3px solid ${s.c};padding:10px;">
        <div style="font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);margin-bottom:5px;">${s.l}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:bold;color:${s.c};">${s.v}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:3px;">${s.sub}</div>
      </div>`).join('')}
    </div>`;
  }

  // ── Return distribution chart — pure HTML (no canvas offsetWidth issues) ──
  const retCanvas = document.getElementById('relReturnChart');
  if(retCanvas) {
    const buckets = [
      {label:'< −4%', min:-99, max:-4},
      {label:'−4 to −2', min:-4, max:-2},
      {label:'−2 to −1', min:-2, max:-1},
      {label:'−1 to 0',  min:-1, max:0},
      {label:'0 to +1',  min:0,  max:1},
      {label:'+1 to +2', min:1,  max:2},
      {label:'+2 to +4', min:2,  max:4},
      {label:'> +4%',   min:4,  max:99},
    ];
    const counts = buckets.map(b => dayRets.filter(r => r >= b.min && r < b.max).length);
    const maxC = Math.max(...counts, 1);
    const isPos = b => b.min >= 0;
    const BAR_H = 100;
    retCanvas.innerHTML = `<div style="display:flex;align-items:flex-end;gap:3px;height:${BAR_H+30}px;padding:4px 4px 0;">
      ${buckets.map((b,i) => {
        const c = counts[i];
        const h = c ? Math.max(Math.round(c/maxC*BAR_H), 4) : 0;
        const bc = b.min >= 0 ? '#00ff88' : b.max <= 0 ? '#ff3355' : '#ffcc00';
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;height:100%;">
          <div style="font-size:9px;color:rgba(255,255,255,0.6);">${c||''}</div>
          <div style="width:100%;height:${h}px;background:${bc}99;border-radius:2px 2px 0 0;"></div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:3px;padding:2px 4px 0;">
      ${buckets.map(b=>`<div style="flex:1;text-align:center;font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text3);white-space:nowrap;overflow:hidden;">${b.label}</div>`).join('')}
    </div>`;
  }

  // ── Before/Day-Of/After window chart — pure HTML ─────────────────────────
  const winCanvas = document.getElementById('relWindowChart');
  if(winCanvas) {
    const avgB = avg(beforeRets), avgD = avg(dayRets), avgA = avg(afterRets);
    const vals = [
      {l:'5d BEFORE', v:avgB, n:beforeRets.length, wu:pctUp(beforeRets,r=>r>0)},
      {l:'DAY-OF',    v:avgD, n:n,                 wu:pctUp(dayRets,r=>r>0)},
      {l:'5d AFTER',  v:avgA, n:afterRets.length,  wu:pctUp(afterRets,r=>r>0)},
    ];
    const maxAbs = Math.max(...vals.map(v=>Math.abs(v.v)), 0.3);
    const WIN_BAR_H = 90; // max bar height in px
    const midLine = WIN_BAR_H + 10; // baseline y offset — bars go up or down from here
    const totalH = midLine * 2 + 30;
    winCanvas.innerHTML = `<div style="display:flex;gap:12px;align-items:center;justify-content:space-around;height:${totalH}px;padding:8px;">
      ${vals.map(v => {
        const bc = v.v>=0?'#00ff88':'#ff3355';
        const barH = Math.max(Math.abs(v.v)/maxAbs*WIN_BAR_H, 4);
        const isPos = v.v >= 0;
        // Each bar column: fixed height, content laid out with flexbox
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;height:100%;justify-content:center;">
          ${isPos ? `<div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${bc};font-weight:bold;">${v.v>=0?'+':''}${v.v.toFixed(3)}%</div>
          <div style="width:60%;height:${barH.toFixed(0)}px;background:${bc}99;border-radius:4px 4px 0 0;"></div>
          <div style="width:60%;height:2px;background:#444;"></div>
          <div style="font-family:'Orbitron',monospace;font-size:8px;color:${bc};letter-spacing:1px;">${v.l}</div>
          <div style="font-size:10px;color:var(--text3);">${v.wu.toFixed(0)}% up · n=${v.n}</div>`
          : `<div style="font-family:'Orbitron',monospace;font-size:8px;color:${bc};letter-spacing:1px;">${v.l}</div>
          <div style="font-size:10px;color:var(--text3);">${v.wu.toFixed(0)}% up · n=${v.n}</div>
          <div style="width:60%;height:2px;background:#444;"></div>
          <div style="width:60%;height:${barH.toFixed(0)}px;background:${bc}99;border-radius:0 0 4px 4px;"></div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:${bc};font-weight:bold;">${v.v.toFixed(3)}%</div>`}
        </div>`;
      }).join('')}
    </div>`;
  }

  // ── Event log table ──────────────────────────────────────────────────────
  const headEl = document.getElementById('rel-table-head');
  const bodyEl = document.getElementById('rel-table-body');
  const tableLabel = document.getElementById('rel-table-label');
  if(tableLabel) tableLabel.textContent = `⬡ ${label} EVENT LOG — ${data.length} EVENTS`;
  if(headEl) {
    const thStyle = `style="padding:6px 8px;font-family:'Orbitron',monospace;font-size:8px;color:var(--text3);border-bottom:1px solid var(--border);text-align:right;"`;
    const thStyleL = `style="padding:6px 8px;font-family:'Orbitron',monospace;font-size:8px;color:${color};border-bottom:1px solid var(--border);text-align:left;"`;
    headEl.innerHTML = `<th ${thStyleL}>DATE</th><th ${thStyleL}>NOTES</th>
      <th ${thStyle}>OPEN</th><th ${thStyle}>HIGH</th><th ${thStyle}>LOW</th><th ${thStyle}>CLOSE</th>
      <th ${thStyle}>GAP</th><th ${thStyle}>DAY RETURN</th><th ${thStyle}>DAY RANGE</th>
      <th ${thStyle}>5d BEFORE</th><th ${thStyle}>5d AFTER</th>`;
  }
  if(bodyEl) {
    const fmt2 = v => v != null ? (v>=0?'+':'')+v.toFixed(3)+'%' : '—';
    const clr  = v => v == null ? 'var(--text3)' : v>0?'#00ff88':v<0?'#ff3355':'var(--text2)';
    bodyEl.innerHTML = [...data].reverse().map(d => `<tr style="border-bottom:1px solid var(--border)22;">
      <td style="padding:5px 8px;font-family:'Share Tech Mono',monospace;font-size:11px;color:${color};">${d.date}</td>
      <td style="padding:5px 8px;font-size:10px;color:var(--text3);">${d.notes||'—'}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text2);">$${d.open.toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:#00ff8888;">$${d.high.toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:#ff335588;">$${d.low.toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${d.day_ret>=0?'#00ff88':'#ff3355'};">$${d.close.toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${clr(d.gap)};">${fmt2(d.gap)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;color:${clr(d.day_ret)};">${fmt2(d.day_ret)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--cyan);">$${d.range.toFixed(2)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${clr(d.before_ret)};">${fmt2(d.before_ret)}</td>
      <td style="padding:5px 8px;text-align:right;font-family:'Share Tech Mono',monospace;font-size:11px;color:${clr(d.after_ret)};">${fmt2(d.after_ret)}</td>
    </tr>`).join('');
  }
}

// ---- POLITICAL CYCLE ----
function esRenderPolitical(){
  // Always uses all_time data — political cycle analysis requires full history
  const p = ES_DATA.political;
  if(!p) return;
  const winC = w => w>=75?'var(--green)':w>=60?'#88cc44':w>=50?'var(--yellow)':'var(--red)';

  const cycles = [
    {k:'year1',   label:'YEAR 1',        sub:'Post-election year', color:'#00ccff'},
    {k:'year3',   label:'YEAR 3',        sub:'Pre-election year',  color:'#00ff88'},
    {k:'election',label:'ELECTION YEAR', sub:'Year 4',             color:'#ffcc00'},
    {k:'midterm', label:'MIDTERM YEAR',  sub:'Year 2',             color:'#ff8800'},
  ];

  // Summary cards
  const sumEl = document.getElementById('es-pol-summary-cards');
  if(sumEl) sumEl.innerHTML = cycles.map(({k,label,sub,color})=>{
    const d=p[k];
    return `<div class="es-card" style="border-top:3px solid ${color};">
      <div class="es-card-label" style="color:${color};">${label}</div>
      <div class="es-card-val ${d.avg>=0?'up':'dn'}" style="font-size:24px;">${d.avg>=0?'+':''}${esN(d.avg)}%</div>
      <div class="es-card-sub"><span style="color:${winC(d.win_rate)}">${d.win_rate}%</span> win rate · ${d.count} yrs</div>
      <div style="font-size:10px;color:var(--text3);margin-top:5px;">${sub} · median ${d.median>=0?'+':''}${esN(d.median)}%</div>
      <div style="font-size:10px;margin-top:3px;">Best <span class="up">+${esN(d.best)}%</span> (${d.best_year}) · Worst <span class="dn">${esN(d.worst)}%</span> (${d.worst_year})</div>
    </div>`;
  }).join('');

  // Bar chart
  const barsEl = document.getElementById('es-pol-bars');
  const maxV = Math.max(...cycles.map(c=>Math.abs(p[c.k].avg)))||1;
  if(barsEl) barsEl.innerHTML = cycles.map(({k,label,color})=>{
    const d=p[k]; const w=Math.abs(d.avg)/maxV*88;
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;color:${color};width:150px;flex-shrink:0;">${label}</span>
      <div style="flex:1;height:24px;background:var(--bg3);border-radius:3px;overflow:hidden;">
        <div style="width:${w}%;height:100%;background:${color};opacity:0.75;border-radius:3px;"></div>
      </div>
      <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:${color};width:65px;text-align:right;">${d.avg>=0?'+':''}${esN(d.avg)}%</span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${winC(d.win_rate)};width:55px;text-align:right;">${d.win_rate}% W</span>
    </div>`;
  }).join('');

  // Year-by-year tables
  const tablesEl = document.getElementById('es-pol-tables');
  if(tablesEl) tablesEl.innerHTML = cycles.map(({k,label,color})=>{
    const d=p[k]; if(!d.years) return '';
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:14px;">
      <div style="font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1.5px;color:${color};margin-bottom:10px;">${label}</div>
      ${d.years.map(({year,ret})=>`
        <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);">
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--text2);width:40px;">${year}</span>
          <div style="flex:1;height:7px;background:var(--bg3);border-radius:2px;overflow:hidden;">
            <div style="width:${Math.min(Math.abs(ret)/40*100,100)}%;height:100%;background:${ret>=0?'rgba(0,255,136,0.7)':'rgba(255,51,85,0.7)'};${ret<0?'margin-left:auto;':''}border-radius:2px;"></div>
          </div>
          <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${ret>=0?'var(--green)':'var(--red)'};width:65px;text-align:right;">${ret>=0?'+':''}${esN(ret)}%</span>
        </div>`).join('')}
    </div>`;
  }).join('');

  // Party cards
  const partyEl = document.getElementById('es-pol-party-cards');
  if(partyEl) partyEl.innerHTML = `
    <div class="es-card" style="border-top:3px solid #4488ff;">
      <div class="es-card-label" style="color:#4488ff;">🔵 DEMOCRATIC PRESIDENCY</div>
      <div class="es-card-val up">+${esN(p.dem.avg)}%</div>
      <div class="es-card-sub"><span style="color:${winC(p.dem.win_rate)}">${p.dem.win_rate}%</span> win rate · ${p.dem.count} yrs</div>
      <div style="font-size:10px;color:var(--text3);margin-top:5px;">Clinton 1993–2000 · Obama 2009–2016 · Biden 2021–2024</div>
      <div style="font-size:10px;margin-top:3px;">Best <span class="up">+${esN(p.dem.best)}%</span> · Worst <span class="dn">${esN(p.dem.worst)}%</span></div>
    </div>
    <div class="es-card" style="border-top:3px solid #ff4444;">
      <div class="es-card-label" style="color:#ff4444;">🔴 REPUBLICAN PRESIDENCY</div>
      <div class="es-card-val up">+${esN(p.rep.avg)}%</div>
      <div class="es-card-sub"><span style="color:${winC(p.rep.win_rate)}">${p.rep.win_rate}%</span> win rate · ${p.rep.count} yrs</div>
      <div style="font-size:10px;color:var(--text3);margin-top:5px;">Bush 2001–2008 · Trump 2017–2020 · Trump 2025+</div>
      <div style="font-size:10px;margin-top:3px;">Best <span class="up">+${esN(p.rep.best)}%</span> · Worst <span class="dn">${esN(p.rep.worst)}%</span></div>
    </div>
    <div class="es-card">
      <div class="es-card-label">⚠️ CONTEXT</div>
      <div class="es-card-val neu" style="font-size:14px;line-height:1.3;">Correlation ≠ Causation</div>
      <div style="font-size:10px;color:var(--text3);margin-top:8px;line-height:1.5;">The Dem/Rep gap is largely explained by <em>when</em> each party was in power — dot-com bust + GFC both fell on Republican terms. Markets respond to rates, earnings, and cycles — not party affiliation.</div>
    </div>`;

  // Q4 cards
  const q4El = document.getElementById('es-pol-q4-cards');
  if(q4El) q4El.innerHTML = [
    {k:'year1_q4',   label:'YEAR 1 Q4',   color:'#00ccff'},
    {k:'year3_q4',   label:'YEAR 3 Q4',   color:'#00ff88'},
    {k:'midterm_q4', label:'MIDTERM Q4',  color:'#ff8800'},
    {k:'election_q4',label:'ELECTION Q4', color:'#ffcc00'},
  ].map(({k,label,color})=>{
    const d=p[k];
    return `<div class="es-card" style="border-top:3px solid ${color};">
      <div class="es-card-label" style="color:${color};">${label}</div>
      <div class="es-card-val ${d.avg>=0?'up':'dn'}">${d.avg>=0?'+':''}${esN(d.avg)}%</div>
      <div class="es-card-sub"><span style="color:${winC(d.win_rate)}">${d.win_rate}%</span> win rate · ${d.count} yrs</div>
      <div style="font-size:10px;color:var(--text3);margin-top:4px;">Oct–Dec performance</div>
    </div>`;
  }).join('');
}

function esRenderAll(){
  esRenderDOW(); esRenderWOM(); esRenderSeasonality(); esRenderQuarterly();
  esRenderYearly(); esRenderStreaks(); esRenderVolEdge(); esRenderRecovery(); esRenderHolidays();
  if(typeof renderDeclines==='function') renderDeclines();
  esRenderReleases(); esRenderPolitical();
}
esRenderAll();

// ── EVENTS TAB helpers ──────────────────────────────────────────────────────
window.evSub = function(id, el) {
  document.querySelectorAll('#panel-events .es-subtab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#panel-events .es-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('ev-' + id).classList.add('active');
  if (id === 'holidays') renderEvHolidays();
  if (id === 'mag7earnings') renderEvMag7();
  if (id === 'releases') renderEvReleases();
};

window.renderEvHolidays = function() {
  esRenderHolidays();
  const copy = (from, to) => { const s=document.getElementById(from),d=document.getElementById(to); if(s&&d) d.innerHTML=s.innerHTML; };
  copy('es-sw-cards','ev-sw-cards'); copy('es-santa-boxes','ev-santa-boxes');
  copy('es-santa-tbl','ev-santa-tbl'); copy('es-hol-grid','ev-hol-grid');
  copy('es-seasonal-grid','ev-seasonal-grid'); copy('es-hol-tbody','ev-hol-tbody');
  const lbEl=document.getElementById('ev-hol-lb');
  if(lbEl) lbEl.innerHTML=`<div class="es-lookback">
    <button class="es-lb-btn ${esLookback==='all_time'?'active':''}" onclick="esSetLookback('all_time');renderEvHolidays();">ALL TIME</button>
    <button class="es-lb-btn ${esLookback==='since_2020'?'active':''}" onclick="esSetLookback('since_2020');renderEvHolidays();">SINCE 2020</button>
    <button class="es-lb-btn ${esLookback==='current_year'?'active':''}" onclick="esSetLookback('current_year');renderEvHolidays();">2026 YTD</button>
  </div>`;
  const metaEl=document.getElementById('ev-hol-meta');
  if(metaEl){const m=ES().meta;metaEl.textContent=`${m.daily_count.toLocaleString()} days`;}
};

let _evRelLookback='all', _evRelType='cpi';
window.evRelLookback = function(lb,btn) {
  _relLookback=lb; // sync the underlying variable
  document.querySelectorAll('#ev-releases .rel-lb-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // also sync the hidden es-releases buttons so esRenderReleases reads correct state
  document.querySelectorAll('#es-releases .rel-lb-btn').forEach((b,i)=>{
    const lbs=['all','1yr','2026'];
    b.classList.toggle('active', lbs[i]===lb);
  });
  renderEvReleases();
};
window.evRelType = function(type,btn) {
  _relType=type; // sync underlying variable
  document.querySelectorAll('#ev-releases .rel-type-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // sync hidden es-releases type buttons
  ['cpi','nfp','fomc'].forEach(t=>{
    const b=document.getElementById('reltab-'+t);
    if(b) b.classList.toggle('active',t===type);
  });
  renderEvReleases();
};

window.renderEvReleases = function() {
  esRenderReleases();
  // Sync ev lookback button active state to match current _relLookback
  const lbMap={'all':'ev-rel-lb-all','1yr':'ev-rel-lb-1yr','2026':'ev-rel-lb-2026'};
  Object.entries(lbMap).forEach(([lb,id])=>{
    const b=document.getElementById(id);
    if(b) b.classList.toggle('active', (typeof _relLookback!=='undefined'?_relLookback:'all')===lb);
  });
  // Sync ev type button active state
  ['cpi','nfp','fomc'].forEach(t=>{
    const b=document.getElementById('ev-reltab-'+t);
    if(b) b.classList.toggle('active',(typeof _relType!=='undefined'?_relType:'cpi')===t);
  });
  const copy=(from,to)=>{const s=document.getElementById(from),d=document.getElementById(to);if(s&&d)d.innerHTML=s.innerHTML;};
  copy('rel-stat-cards','ev-stat-cards');
  copy('rel-upcoming-banner','ev-upcoming-banner');
  copy('rel-table-head','ev-table-head');
  copy('rel-table-body','ev-table-body');
  copy('relReturnChart','evReturnChart2');
  copy('relWindowChart','evWindowChart2');
  const l1=document.getElementById('ev-chart-label'),s1=document.getElementById('rel-chart-label');
  if(l1&&s1) l1.textContent=s1.textContent;
  const l2=document.getElementById('ev-table-label'),s2=document.getElementById('rel-table-label');
  if(l2&&s2) l2.textContent=s2.textContent;
};

window.evMag7Lookback = function(lb, btn) {
  // Sync with the underlying mag7 lookback and re-render
  if(typeof mag7SetLookback === 'function') {
    // Find the matching mag7 button in panel-mag7 and click it
    const map = {all:'mag7lb-all', r2023:'mag7lb-r2023', r2026:'mag7lb-r2026'};
    const srcBtn = document.getElementById(map[lb]);
    if(srcBtn) mag7SetLookback(lb, srcBtn);
  }
  document.querySelectorAll('#ev-mag7earnings .rel-lb-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  window.renderEvMag7();
};

window.renderEvMag7 = function() {
  const el=document.getElementById('evMag7Content');
  if(!el) return;
  if(typeof MAG7_EARNINGS_DATA==='undefined'){el.innerHTML='<div class="no-data">MAG7 data not loaded</div>';return;}
  if(typeof renderMag7==='function') renderMag7();
  const src=document.getElementById('panel-mag7');
  if(src) {
    // Clone and strip the first child (lookback button row) so it doesn't duplicate
    const clone = src.cloneNode(true);
    const firstDiv = clone.querySelector('div');
    if(firstDiv && firstDiv.querySelector('.mag7-lb-btn')) firstDiv.remove();
    el.innerHTML = clone.innerHTML;
  }
};

window.vsSubTab = function(id,el) {
  document.querySelectorAll('#panel-volstats .es-subtab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
};

// Render releases on first events tab open
window.renderEvReleases();

})();
