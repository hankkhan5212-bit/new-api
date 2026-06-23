package ratio_setting

import (
	"encoding/json"
	"errors"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/QuantumNous/new-api/types"
)

var defaultGroupRatio = map[string]float64{
	"default": 1,
	"vip":     1,
	"svip":    1,
}

var groupRatioMap = types.NewRWMap[string, float64]()

var defaultGroupGroupRatio = map[string]map[string]float64{
	"vip": {
		"edit_this": 0.9,
	},
}

var groupGroupRatioMap = types.NewRWMap[string, map[string]float64]()

var defaultGroupSpecialUsableGroup = map[string]map[string]string{
	"vip": {
		"append_1":   "vip_special_group_1",
		"-:remove_1": "vip_removed_group_1",
	},
}

// modelGroupRatioMap 存储分组内特定模型的倍率覆盖
// 结构：map[分组名称]map[模型名称]倍率
// 例：modelGroupRatio["vip"]["gpt-4"] = 0.8
var modelGroupRatioMap = types.NewRWMap[string, map[string]float64]()
var defaultModelGroupRatio = map[string]map[string]float64{
	"vip": {
		"example-model": 0.8,
	},
}

type GroupRatioSetting struct {
	GroupRatio              *types.RWMap[string, float64]            `json:"group_ratio"`
	GroupGroupRatio         *types.RWMap[string, map[string]float64] `json:"group_group_ratio"`
	GroupSpecialUsableGroup *types.RWMap[string, map[string]string]  `json:"group_special_usable_group"`
	ModelGroupRatio         *types.RWMap[string, map[string]float64] `json:"model_group_ratio"`
	MultiGroupStrategy      string                                   `json:"multi_group_strategy"` // "priority_order" (default) or "lowest_ratio"
}

var groupRatioSetting GroupRatioSetting

func init() {
	groupSpecialUsableGroup := types.NewRWMap[string, map[string]string]()
	groupSpecialUsableGroup.AddAll(defaultGroupSpecialUsableGroup)

	groupRatioMap.AddAll(defaultGroupRatio)
	groupGroupRatioMap.AddAll(defaultGroupGroupRatio)
	modelGroupRatioMap.AddAll(defaultModelGroupRatio)

	groupRatioSetting = GroupRatioSetting{
		GroupSpecialUsableGroup: groupSpecialUsableGroup,
		GroupRatio:              groupRatioMap,
		GroupGroupRatio:         groupGroupRatioMap,
		ModelGroupRatio:         modelGroupRatioMap,
	}

	config.GlobalConfig.Register("group_ratio_setting", &groupRatioSetting)
}

func GetGroupRatioSetting() *GroupRatioSetting {
	if groupRatioSetting.GroupSpecialUsableGroup == nil {
		groupRatioSetting.GroupSpecialUsableGroup = types.NewRWMap[string, map[string]string]()
		groupRatioSetting.GroupSpecialUsableGroup.AddAll(defaultGroupSpecialUsableGroup)
	}
	return &groupRatioSetting
}

func GetGroupRatioCopy() map[string]float64 {
	return groupRatioMap.ReadAll()
}

func ContainsGroupRatio(name string) bool {
	_, ok := groupRatioMap.Get(name)
	return ok
}

func GroupRatio2JSONString() string {
	return groupRatioMap.MarshalJSONString()
}

func UpdateGroupRatioByJSONString(jsonStr string) error {
	return types.LoadFromJsonString(groupRatioMap, jsonStr)
}

func GetGroupRatio(name string) float64 {
	ratio, ok := groupRatioMap.Get(name)
	if !ok {
		common.SysLog("group ratio not found: " + name)
		return 1
	}
	return ratio
}

func GetGroupGroupRatio(userGroup, usingGroup string) (float64, bool) {
	gp, ok := groupGroupRatioMap.Get(userGroup)
	if !ok {
		return -1, false
	}
	ratio, ok := gp[usingGroup]
	if !ok {
		return -1, false
	}
	return ratio, true
}

func GroupGroupRatio2JSONString() string {
	return groupGroupRatioMap.MarshalJSONString()
}

func UpdateGroupGroupRatioByJSONString(jsonStr string) error {
	return types.LoadFromJsonString(groupGroupRatioMap, jsonStr)
}

func CheckGroupRatio(jsonStr string) error {
	checkGroupRatio := make(map[string]float64)
	err := json.Unmarshal([]byte(jsonStr), &checkGroupRatio)
	if err != nil {
		return err
	}
	for name, ratio := range checkGroupRatio {
		if ratio < 0 {
			return errors.New("group ratio must be not less than 0: " + name)
		}
	}
	return nil
}

// GetModelGroupRatio 获取指定分组下某个模型的倍率覆盖值。
// 优先查找 modelGroupRatioMap[group][model]，未找到时回退到 GetGroupRatio(group)。
func GetModelGroupRatio(group, model string) float64 {
	if group == "" || model == "" {
		return 1.0
	}
	// 先尝试 normalized matching
	normalized := FormatMatchingModelName(model)
	// 1. 先尝试精确匹配
	if modelRatios, ok := modelGroupRatioMap.Get(group); ok {
		if ratio, ok := modelRatios[model]; ok {
			return ratio
		}
		if normalized != "" && normalized != model {
			if ratio, ok := modelRatios[normalized]; ok {
				return ratio
			}
		}
	}
	// 2. 回退到分组默认倍率
	return GetGroupRatio(group)
}

// ModelGroupRatio2JSONString 序列化模型分组倍率配置为 JSON 字符串。
func ModelGroupRatio2JSONString() string {
	return modelGroupRatioMap.MarshalJSONString()
}

// UpdateModelGroupRatioByJSONString 从 JSON 字符串加载模型分组倍率配置。
func UpdateModelGroupRatioByJSONString(jsonStr string) error {
	return types.LoadFromJsonString(modelGroupRatioMap, jsonStr)
}

// GetModelGroupRatioCopy 返回模型分组倍率配置的副本。
func GetModelGroupRatioCopy() map[string]map[string]float64 {
	return modelGroupRatioMap.ReadAll()
}

// GetMultiGroupStrategy returns the multi-group selection strategy.
// "priority_order" (default): use token group first / auto order.
// "lowest_ratio": prefer groups with lower model_group_ratio for the request model.
func GetMultiGroupStrategy() string {
	if strategy := groupRatioSetting.MultiGroupStrategy; strategy == "lowest_ratio" {
		return strategy
	}
	return "priority_order"
}

// GetModelGroupRatioForGroup returns the model_group_ratio for a specific group and model.
// Falls back to GetGroupRatio(group) if no model-level override exists.
func GetModelGroupRatioForGroup(group, model string) float64 {
	return GetModelGroupRatio(group, model)
}
